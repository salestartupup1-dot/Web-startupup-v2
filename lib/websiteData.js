import { getPublicData } from './publicDataCache.js';
import { getWebsiteStock } from './seoStock.js';
import { withWebsiteInventory } from './websiteInventory.js';
import { withCanonicalPropertyPaths } from './propertyShortLinks.js';
export async function getWebsiteData(options = {}) {
  const [data, stock] = await Promise.all([getPublicData(options), options.includeProperties === false ? null : getWebsiteStock()]);
  const properties = data.properties && await withCanonicalPropertyPaths(data.properties);
  return { ...data, ...(properties ? { properties: properties.map(p => withWebsiteInventory(p, stock)) } : {}) };
}
