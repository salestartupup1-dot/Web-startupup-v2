import { createHash } from 'node:crypto';
import { propertySlugLabel, propertyShareLabel, isPropertySlug } from './propertyRoutes.js';
import { propertyShortLinks } from './propertyShortLinks.js';
import { publicCatalogueStore } from './publicCatalogueStore.js';

export const PROPERTY_SLUGS = 'website_property_slugs_private';
const slugKey = slug => createHash('sha256').update(slug).digest('hex');
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
const failure = status => Object.assign(new Error('Property URL unavailable'), { status });

export function createPropertyCanonicalLinks({ database, sharedCache, shortCode }) {
  const owners = new Map(), pending = new Map();
  let preparation, revision = 0, publishedRevision = -1;
  const remember = (slug, id) => {
    if (owners.size >= 4096) owners.clear();
    if (owners.get(slug) !== id) { owners.set(slug, id); revision++; }
  };
  const cacheKey = slug => `property-readable-route-v1:${slugKey(slug)}`;
  async function resolve(slug) {
    if (!isPropertySlug(slug)) return null;
    if (owners.has(slug)) return owners.get(slug);
    const cached = await sharedCache?.get(cacheKey(slug)).catch(() => undefined);
    if (cached?.slug === slug && validId(cached.propertyId)) {
      remember(slug, cached.propertyId); return cached.propertyId;
    }
    const record = (await (await database()).collection(PROPERTY_SLUGS).doc(slugKey(slug)).get()).data();
    if (!record) return null;
    if (record.slug !== slug || !validId(record.propertyId)) throw failure(503);
    remember(slug, record.propertyId);
    await sharedCache?.set(cacheKey(slug), record).catch(() => {});
    return record.propertyId;
  }
  async function reserve(property, label) {
    if (!validId(property?.id)) throw failure(400);
    let base = label, code;
    const getCode = async () => code ||= (await shortCode(property.id)).replace(/^\//, '');
    if (!property.house_number || !isPropertySlug(base)) base = `${base || 'บ้าน'}-${await getCode()}`;
    for (let attempt = 0; attempt < 12; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${await getCode()}${attempt > 1 ? `-${attempt}` : ''}`;
      if (!isPropertySlug(slug)) throw failure(400);
      if (owners.has(slug)) {
        if (owners.get(slug) === property.id) return `/${encodeURIComponent(slug)}`;
        continue;
      }
      const cached = await sharedCache?.get(cacheKey(slug)).catch(() => undefined);
      if (cached?.slug === slug && validId(cached.propertyId)) {
        remember(slug, cached.propertyId);
        if (cached.propertyId === property.id) return `/${encodeURIComponent(slug)}`;
        continue;
      }
      const db = await database();
      const ref = db.collection(PROPERTY_SLUGS).doc(slugKey(slug));
      const owner = await db.runTransaction(async tx => {
        const existing = (await tx.get(ref)).data();
        if (existing) {
          if (existing.slug !== slug || !validId(existing.propertyId)) throw failure(503);
          return existing.propertyId;
        }
        const house = await tx.get(db.doc(`artifacts/startup-up-realestate/public/data/properties/${property.id}`));
        if (!house.exists) throw failure(404);
        tx.create(ref, { slug, propertyId: property.id });
        return property.id;
      });
      remember(slug, owner);
      await sharedCache?.set(cacheKey(slug), { slug, propertyId: owner }).catch(() => {});
      if (owner === property.id) return `/${encodeURIComponent(slug)}`;
    }
    throw failure(503);
  }
  function claim(property, label) {
    const key = JSON.stringify([property?.id, label]);
    if (!pending.has(key)) pending.set(key, reserve(property, label).finally(() => pending.delete(key)));
    return pending.get(key);
  }
  return {
    resolve,
    create: property => claim(property, propertySlugLabel(property)),
    // House-number aliases share the registry, so a number already taken by another
    // house (or by a readable name) gets the short-code suffix and never changes owner.
    share(property) {
      const label = propertyShareLabel(property);
      if (label) return claim(property, label);
      if (!validId(property?.id)) return Promise.reject(failure(400));
      return shortCode(property.id);
    },
    prepare() {
      if (!preparation) preparation = (async () => {
        let entries = await sharedCache?.get('property-readable-index-v1').catch(() => undefined);
        if (!Array.isArray(entries)) {
          const snapshot = await (await database()).collection(PROPERTY_SLUGS).get();
          entries = snapshot.docs.map(doc => { const r = doc.data(); return [r.slug, r.propertyId]; });
          await sharedCache?.set('property-readable-index-v1', entries).catch(() => {});
        }
        for (const [slug, id] of entries) if (isPropertySlug(slug) && validId(id)) remember(slug, id);
      })().catch(error => { preparation = undefined; throw error; });
      return preparation;
    },
    async publishIndex() {
      if (publishedRevision === revision) return;
      const publishing = revision;
      await sharedCache?.set('property-readable-index-v1', [...owners]).catch(() => {});
      publishedRevision = publishing;
    },
  };
}

export const propertyCanonicalLinks = createPropertyCanonicalLinks({
  database: async () => {
    const db = (await import('./lineServer.js')).leadDb();
    if (db.projectId !== 'startup-up-realestate') throw failure(503);
    return db;
  },
  sharedCache: publicCatalogueStore,
  shortCode: id => propertyShortLinks.create(id),
});

export async function withCanonicalPropertyPath(property) {
  return { ...property, canonicalPath: await propertyCanonicalLinks.create(property) };
}
// A copied Thai path costs 9 characters per letter (%E0%B8..), so shares use the
// house-number alias, which redirects permanently to the readable page.
export async function withPropertyLinks(property) {
  const [linked, sharePath] = await Promise.all([withCanonicalPropertyPath(property),
    propertyCanonicalLinks.share(property).catch(() => undefined)]);
  return sharePath ? { ...linked, sharePath } : linked;
}
export async function withCanonicalPropertyPaths(properties = []) {
  if (!properties.length) return [];
  await propertyCanonicalLinks.prepare();
  const result = [];
  for (let i = 0; i < properties.length; i += 12) {
    result.push(...await Promise.all(properties.slice(i, i + 12).map(p => withCanonicalPropertyPath(p).catch(error => {
      if (error.status === 404) return p;
      throw error;
    }))));
  }
  await propertyCanonicalLinks.publishIndex();
  return result;
}
