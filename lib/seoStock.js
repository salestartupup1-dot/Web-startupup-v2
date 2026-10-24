import { fetchMasterStockIndex } from './masterStock.js';
import { publicCatalogueStore } from './publicCatalogueStore.js';
import { withWebsiteInventory, isSaleAvailable } from './websiteInventory.js';
import { isIndexableProperty } from './seo.js';

let pending, memory;
const fresh = value => value?.checkedAt > Date.now() - 60000;
export async function getSeoStock() {
  if (fresh(memory)) return memory.stock;
  if (!pending) pending = (async () => {
    const cached = await publicCatalogueStore.get('seo-master-stock-v1');
    if (fresh(cached)) { memory = cached; return cached.stock; }
    const stock = await fetchMasterStockIndex();
    if (!stock.coveredOwners?.includes('Startup Up')) throw new Error('Primary stock could not be verified');
    memory = { checkedAt: Date.now(), stock };
    await publicCatalogueStore.set('seo-master-stock-v1', memory);
    return stock;
  })().finally(() => { pending = null; });
  return pending;
}

export function includePropertyInSitemap(property, stock) {
  return isIndexableProperty(property) && isSaleAvailable(withWebsiteInventory(property, stock));
}
let failedUntil = 0;
export async function getWebsiteStock() {
  if (Date.now() < failedUntil) return null;
  let timer;
  try {
    // A stock outage cannot hold a price page until the upstream 15s timeout.
    // The shared refresh continues; subsequent requests can use the result.
    return await Promise.race([getSeoStock(), new Promise(resolve => {
      timer = setTimeout(() => resolve(null), 2500);
    })]);
  } catch { failedUntil = Date.now() + 60000; return null; }
  finally { clearTimeout(timer); }
}
export async function enrichWebsiteProperty(property) {
  return withWebsiteInventory(property, await getWebsiteStock());
}
