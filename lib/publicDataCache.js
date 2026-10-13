import { fetchPublicCollectionRest, fetchPublicDocumentRest } from './firestorePublic.js';
import { publicDataVersion } from './publicDataVersion.js';
import { publicCatalogueStore } from './publicCatalogueStore.js';

export const PUBLIC_VERSION_PATH = 'site_settings/public_version';

// Validate one small revision document per request, reusing the catalogue only
// after confirming its revision. Never return stale prices on read failure.
export function createPublicDataCache({ readDocument, readCollection, sharedCache }) {
  let cache = null;
  let inFlight = null;
  const readVersion = async () => publicDataVersion(await readDocument(PUBLIC_VERSION_PATH));
  const read = async () => {
    let version = await readVersion();
    if (version && cache?.version === version) return { ...cache, cached: true };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (version && sharedCache) {
        const shared = await sharedCache.get(version).catch(() => undefined);
        if (shared?.version === version && Array.isArray(shared.properties)) {
          const confirmedVersion = await readVersion();
          if (confirmedVersion === version) {
            cache = shared;
            return { ...cache, cached: true };
          }
          version = confirmedVersion;
          continue;
        }
      }
      const [properties, company, visual, popup] = await Promise.all([
        readCollection('properties'), readDocument('company_info/main'),
        readDocument('site_settings/visual'), readDocument('site_settings/popup'),
      ]);
      const confirmedVersion = await readVersion();
      if (version === confirmedVersion) {
        cache = { properties, company, visual, popup, version, updatedAt: new Date().toISOString() };
        if (version && sharedCache) await sharedCache.set(version, cache).catch(() => {});
        return { ...cache, cached: false };
      }
      version = confirmedVersion;
    }
    throw new Error('Public data changed during loading. Please retry.');
  };
  return () => {
    if (!inFlight) inFlight = read().finally(() => { inFlight = null; });
    return inFlight;
  };
}

export const getPublicData = createPublicDataCache({
  readDocument: path => fetchPublicDocumentRest(path, { cache: 'no-store' }),
  readCollection: fetchPublicCollectionRest,
  sharedCache: publicCatalogueStore,
});
export const getPublicProperties = async () => (await getPublicData()).properties || [];
