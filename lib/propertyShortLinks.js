import { randomBytes } from 'node:crypto';

export const SHORT_CODES = 'website_short_codes_private';
export const SHORT_IDS = 'website_short_ids_private';
export const isShortCode = value => typeof value === 'string' && /^[a-f0-9]{6}$/.test(value);
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const failure = status => Object.assign(new Error('Short link unavailable'), { status });

export function createPropertyShortLinks({ database, sharedCache, makeCode = () => randomBytes(3).toString('hex') }) {
  const codes = new Map(), ids = new Map(), pending = new Map();
  const remember = (code, id) => {
    if (codes.size >= 2048) { codes.clear(); ids.clear(); }
    codes.set(code, id); ids.set(id, code);
  };
  const cacheKey = id => `immutable-property-short-v1:${id}`;
  let preparation;
  async function create(id) {
    if (!validId(id)) throw failure(400);
    if (ids.has(id)) return `/${ids.get(id)}`;
    const cached = await sharedCache?.get(cacheKey(id)).catch(() => undefined);
    if (cached?.id === id && isShortCode(cached.code)) {
      remember(cached.code, id); return `/${cached.code}`;
    }
    const path = await reserve(id);
    await sharedCache?.set(cacheKey(id), { id, code: path.slice(1) }).catch(() => {});
    return path;
  }
  async function reserve(id) {
      if (!validId(id)) throw failure(400);
      const db = await database();
      const idRef = db.collection(SHORT_IDS).doc(id);
      const houseRef = db.doc(`artifacts/startup-up-realestate/public/data/properties/${id}`);
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = makeCode();
        if (!isShortCode(candidate)) throw failure(503);
        const code = await db.runTransaction(async tx => {
          const existing = (await tx.get(idRef)).data();
          if (existing) {
            if (!isShortCode(existing.code)) throw failure(503);
            return existing.code;
          }
          if (!(await tx.get(houseRef)).exists) throw failure(404);
          const codeRef = db.collection(SHORT_CODES).doc(candidate);
          if ((await tx.get(codeRef)).exists) return null;
          // Atomic, immutable, one-to-one reservation. Never reuse a deleted house's code.
          tx.create(codeRef, { propertyId: id });
          tx.create(idRef, { code: candidate });
          return candidate;
        });
        if (code) { remember(code, id); return `/${code}`; }
      }
      throw failure(503);
  }
  return {
    prepare() {
      // One shared registry snapshot avoids hundreds of cache round trips per list.
      if (!preparation) preparation = (async () => {
        let entries = await sharedCache?.get('immutable-property-short-index-v1').catch(() => undefined);
        if (!Array.isArray(entries)) {
          const snapshot = await (await database()).collection(SHORT_IDS).get();
          entries = snapshot.docs.map(doc => [doc.id, doc.data().code]);
          await sharedCache?.set('immutable-property-short-index-v1', entries).catch(() => {});
        }
        for (const [id, code] of entries) if (validId(id) && isShortCode(code)) remember(code, id);
      })().catch(error => { preparation = undefined; throw error; });
      return preparation;
    },
    create(id) {
      if (!pending.has(id)) pending.set(id, create(id).finally(() => pending.delete(id)));
      return pending.get(id);
    },
    async resolve(code) {
      if (!isShortCode(code)) return null;
      if (codes.has(code)) return codes.get(code);
      const db = await database();
      const data = (await db.collection(SHORT_CODES).doc(code).get()).data();
      if (!data) return null;
      if (!validId(data.propertyId)) throw failure(503);
      remember(code, data.propertyId);
      return data.propertyId;
    },
  };
}

export const propertyShortLinks = createPropertyShortLinks({ sharedCache: {
  get: async key => (await import('./publicCatalogueStore.js')).publicCatalogueStore.get(key),
  set: async (key, value) => (await import('./publicCatalogueStore.js')).publicCatalogueStore.set(key, value),
}, database: async () => {
  const { leadDb } = await import('./lineServer.js');
  const db = leadDb();
  if (db.projectId !== 'startup-up-realestate') throw failure(503);
  return db;
} });
