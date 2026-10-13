import { fetchPublicCollectionRest, fetchPublicDocumentRest } from './firestorePublic.js';
import { publicDataVersion, publicSectionVersion } from './publicDataVersion.js';
import { publicCatalogueStore } from './publicCatalogueStore.js';
import { coordinateCatalogue } from './catalogueCoordinator.js';

export const PUBLIC_VERSION_PATH = 'site_settings/public_version';
const paths = { company: 'company_info/main', visual: 'site_settings/visual', popup: 'site_settings/popup' };

export function createPublicDataCache({ readDocument, readCollection, sharedCache, coordinate, log = () => {} }) {
  const memory = new Map(), pending = new Map();
  const section = async (name, marker) => {
    const version = publicSectionVersion(marker, name);
    const key = `${name}:${version}`;
    if (version && memory.has(key)) return { value: memory.get(key), cached: true };
    const shared = version && await sharedCache?.get(key).catch(() => undefined);
    if (shared?.version === version && Object.hasOwn(shared, 'value')) {
      memory.set(key, shared.value);
      return { value: shared.value, cached: true };
    }
    const load = async () => {
      const value = name === 'properties' ? await readCollection('properties') : await readDocument(paths[name]);
      if (name === 'properties') log({ event: 'catalogue_full_scan', documents: value.length });
      return value;
    };
    const value = name === 'properties' && version && coordinate ? await coordinate(key, load) : await load();
    if (version) {
      if (memory.size > 20) memory.clear();
      memory.set(key, value);
      await sharedCache?.set(key, { version, value }).catch(() => {});
    }
    return { value, cached: false };
  };
  const read = async ({ includeProperties = true, propertiesOnly = false } = {}) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const marker = await readDocument(PUBLIC_VERSION_PATH);
      const version = publicDataVersion(marker);
      const names = propertiesOnly ? ['properties'] : [...(includeProperties ? ['properties'] : []), ...Object.keys(paths)];
      const results = await Promise.all(names.map(name => section(name, marker)));
      // Remote cache reads can race saves: verify again before publishing prices.
      const confirmed = await readDocument(PUBLIC_VERSION_PATH);
      if (version !== publicDataVersion(confirmed)) continue;
      return { ...Object.fromEntries(names.map((name, i) => [name, results[i].value])),
        version, catalogueVersion: publicSectionVersion(marker, 'properties'),
        updatedAt: new Date().toISOString(), cached: results.every(result => result.cached) };
    }
    throw new Error('Public data changed during loading. Please retry.');
  };
  return (options = {}) => {
    const key = JSON.stringify([options.includeProperties !== false, Boolean(options.propertiesOnly)]);
    if (!pending.has(key)) pending.set(key, read(options).finally(() => pending.delete(key)));
    return pending.get(key);
  };
}
export const getPublicData = createPublicDataCache({
  readDocument: path => fetchPublicDocumentRest(path, { cache: 'no-store' }),
  readCollection: fetchPublicCollectionRest,
  sharedCache: publicCatalogueStore,
  coordinate: process.env.VERCEL_ENV === 'production' ? coordinateCatalogue : undefined,
  log: entry => console.info(JSON.stringify(entry)),
});
export const getPublicProperties = async () => (await getPublicData({ propertiesOnly: true })).properties || [];
