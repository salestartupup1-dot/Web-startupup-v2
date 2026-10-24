import { fetchMasterStockIndex } from './masterStock.js';
import { publicCatalogueStore } from './publicCatalogueStore.js';
import { propertyStockStatus } from './stockMatching.js';
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
  if (!isIndexableProperty(property)) return false;
  const result = propertyStockStatus(stock, property);
  // Unknown / ambiguous matches are not evidence that a property has sold,
  // but are also not verified available inventory to advertise in the sitemap.
  if (result.type !== 'available') return false;
  const status = result.hit.status.replace(/\s+/g, '');
  if (/ยื่นซ้อนได้/.test(status)) return true;
  if (/ยื่นกู้|จองแล้ว|ติดจอง|รอโอน|รออนุมัติ/.test(status)) return false;
  return /ว่าง|ยังไม่เสร็จ/.test(status);
}
