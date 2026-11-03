import { getPublicData } from './publicDataCache.js';
import { getWebsiteStock } from './seoStock.js';
import { withWebsiteInventory } from './websiteInventory.js';
import { withCanonicalPropertyPaths } from './propertyCanonicalLinks.js';
export function createWebsiteDataReader({ readData = getPublicData, readStock = getWebsiteStock,
  canonicalize = withCanonicalPropertyPaths } = {}) {
  let prepared;
  return async function readWebsiteData(options = {}) {
    // Always verify the current database revision and stock freshness first.
    // These readers replace snapshots after a save/refresh; only derived work
    // (URL preparation and inventory matching) can be reused by identity.
    const [data, stock] = await Promise.all([readData(options), options.includeProperties === false ? null : readStock()]);
    if (!data.properties) return data;
    if (!prepared || prepared.source !== data.properties || prepared.stock !== stock) {
      const entry = { source: data.properties, stock };
      entry.promise = Promise.resolve().then(() => canonicalize(data.properties))
        .then(properties => properties.map(p => withWebsiteInventory(p, stock)))
        .catch(error => { if (prepared === entry) prepared = undefined; throw error; });
      prepared = entry;
    }
    const properties = await prepared.promise;
    return { ...data, properties };
  };
}
export const getWebsiteData = createWebsiteDataReader();
