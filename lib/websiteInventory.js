import { propertyStockStatus } from './stockMatching.js';
import { matchesSeoLocation, SEO_LOCATIONS } from './seoLocations.js';

export function classifyStockStatus(raw) {
  const status = String(raw || '').normalize('NFKC').replace(/\s+/g, '');
  if (/ขายแล้ว|โอนแล้ว|sold/i.test(status)) return 'sold';
  if (/ยื่นซ้อนได้/.test(status)) return 'backup';
  if (/ยื่นกู้|ประเมิน|รอโอน|ติดจอง|จองแล้ว|รออนุมัติ/.test(status)) return 'reserved';
  if (/ยังไม่เสร็จ/.test(status)) return 'renovating';
  if (/ว่าง/.test(status)) return 'available';
  return 'unknown';
}
export function withWebsiteInventory(property, stock) {
  const match = propertyStockStatus(stock, property);
  // Conflicting duplicate rows must never advertise a house as available.
  const matches = match.hit && stock?.rows?.filter(row => row.owner === match.hit.owner
    && row.key === match.hit.key && row.project === match.hit.project);
  const states = new Set((matches || []).map(row => classifyStockStatus(row.status)));
  const state = property.badge === 'Sold Out' || match.type === 'sold' ? 'sold'
    : match.type === 'available' && states.size <= 1 ? classifyStockStatus(match.hit.status) : 'unknown';
  return { ...property, inventoryState: state };
}
export const inventoryLabel = property => property?.badge === 'Sold Out' ? 'ขายแล้ว' : ({ available: 'พร้อมขาย', renovating: 'กำลังรีโนเวท จองได้',
  backup: 'รับจองสำรอง', reserved: 'ติดจองแล้ว', sold: 'ขายแล้ว', unknown: 'กรุณาสอบถามสถานะล่าสุด' }[property?.inventoryState]
  || (property?.badge === 'Sold Out' ? 'ขายแล้ว' : 'กรุณาสอบถามสถานะล่าสุด'));
export const isSaleAvailable = property => property?.badge !== 'Sold Out'
  && ['available', 'renovating', 'backup'].includes(property?.inventoryState);
export const primaryPropertyLocation = property => SEO_LOCATIONS.find(location =>
  !['รังสิต', 'ปทุมธานี'].includes(location.name) && matchesSeoLocation(property, location))
  || SEO_LOCATIONS.find(location => location.name === 'ปทุมธานี' && matchesSeoLocation(property, location));
export function availableInLocation(properties = [], location) {
  return properties.filter(p => isSaleAvailable(p) && matchesSeoLocation(p, location));
}
export function relatedAvailableProperties(property, properties = []) {
  const location = primaryPropertyLocation(property);
  return properties.filter(p => p.id !== property.id && isSaleAvailable(p)
    && (location ? matchesSeoLocation(p, location) : Boolean(property.main_location && p.main_location === property.main_location)))
    .sort((a, b) => Number(b.project_name === property.project_name) - Number(a.project_name === property.project_name)
      || Math.abs(Number(String(a.price).replace(/,/g, '')) - Number(String(property.price).replace(/,/g, '')))
       - Math.abs(Number(String(b.price).replace(/,/g, '')) - Number(String(property.price).replace(/,/g, '')))).slice(0, 6);
}
