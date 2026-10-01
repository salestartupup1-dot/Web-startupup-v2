import { fetchPublicCollectionRest, fetchPublicDocumentRest } from './firestorePublic.js';
import { publicDataVersion } from './publicDataVersion.js';

export const PUBLIC_VERSION_PATH = 'site_settings/public_version';

// Validate one small revision document per request, reusing the catalogue only
// after confirming its revision. Never return stale prices on read failure.
export function createPublicDataCache({ readDocument, readCollection }) {
  let cache = null;
  let inFlight = null;
  const readVersion = async () => publicDataVersion(await readDocument(PUBLIC_VERSION_PATH));
  const read = async () => {
    let version = await readVersion();
    if (version && cache?.version === version) return { ...cache, cached: true };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [properties, company, visual, popup] = await Promise.all([
        readCollection('properties'), readDocument('company_info/main'),
        readDocument('site_settings/visual'), readDocument('site_settings/popup'),
      ]);
      const confirmedVersion = await readVersion();
      if (version === confirmedVersion) {
        cache = { properties, company, visual, popup, version, updatedAt: new Date().toISOString() };
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
});
export const getPublicProperties = async () => (await getPublicData()).properties || [];
