import { getPublicData } from './publicDataCache.js';
import { getWebsiteStock } from './seoStock.js';
import { withWebsiteInventory } from './websiteInventory.js';
export async function getWebsiteData(options = {}) {
  const [data, stock] = await Promise.all([getPublicData(options), options.includeProperties === false ? null : getWebsiteStock()]);
  return { ...data, ...(data.properties ? { properties: data.properties.map(p => withWebsiteInventory(p, stock)) } : {}) };
}
