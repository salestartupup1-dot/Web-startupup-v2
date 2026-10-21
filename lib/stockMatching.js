import { normalizeHouseKey, normalizeProjectKey } from './masterStockKeys.js';
import { getPropertyOwner } from './propertyOwners.js';

export const stockProjectKey = value => normalizeProjectKey(value)
  .replace(/^(?:โครงการ|หมู่บ้าน|บ้าน)+/, '')
  .replace(/\([^)]*\)/g, '')
  .replace(/ไทยสมบรูณ์/g, 'ไทยสมบูรณ์')
  .replace(/ไพร์ม/g, 'ไพรม์')
  .replace(/กรีนกาเด้น/g, 'กรีนการ์เด้น')
  .replace(/บูรพาวิลล่า/g, 'บูรพา')
  .replace(/^พฤกษาเดอะคัลเลอร์/, 'เดอะคัลเลอร์');

export function sameStockProject(left, right) {
  const a = stockProjectKey(left), b = stockProjectKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const ap = a.match(/\d+/g)?.join('/'), bp = b.match(/\d+/g)?.join('/');
  if (ap && bp && ap !== bp) return false;
  return Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a));
}

export function matchingStockRows(rows, property) {
  const key = normalizeHouseKey(property.house_number);
  if (!/[0-9๐-๙]/.test(key) || !stockProjectKey(property.project_name)) return [];
  const candidates = rows.filter(row => sameStockProject(row.project, property.project_name));
  const exact = candidates.filter(row => row.key === key);
  if (exact.length) return exact;
  return candidates.filter(row => row.key.includes('/') !== key.includes('/')
    && row.key.split('/').pop() === key.split('/').pop());
}

export function propertyStockStatus(stock, property) {
  const owner = getPropertyOwner(property);
  // Old payloads, failed refreshes and uncovered owners cannot prove absence.
  if (!Array.isArray(stock?.rows) || stock.stale || !stock.coveredOwners?.includes(owner)) {
    return { type: 'unavailable' };
  }
  const key = normalizeHouseKey(property.house_number);
  if (!/[0-9๐-๙]/.test(key) || !stockProjectKey(property.project_name)) return { type: 'unavailable' };
  const rows = stock.rows.filter(row => row.owner === owner);
  const hits = matchingStockRows(rows, property);
  const identities = new Set(hits.map(row => `${stockProjectKey(row.project)}|${row.key}`));
  if (identities.size > 1) return { type: 'ambiguous' };
  if (hits.length) {
    // Conflicting duplicate status is not proof that a house has sold.
    if (hits.some(row => row.sold) && hits.some(row => !row.sold)) return { type: 'ambiguous' };
    return { type: hits[0].sold ? 'sold' : 'available', hit: hits[0] };
  }
  // Same number with a different project, or another owner: ask for a review.
  if (stock.rows.some(row => row.key === key) || matchingStockRows(stock.rows, property).length) {
    return { type: 'mismatch' };
  }
  return { type: 'missing' };
}

export function getPropertyStockAlert(stock, property) {
  const result = propertyStockStatus(stock, property);
  if (result.type === 'missing') return { type: 'missing', label: 'ไม่พบรายการตรงกันใน Master Stock',
    title: `ยังไม่พบโครงการ ${property.project_name} บ้านเลขที่ ${property.house_number} ของ ${getPropertyOwner(property)} ในชีตที่อ่านได้ล่าสุด กรุณาตรวจสอบต้นทางก่อนแก้ไขหรือลบ` };
  if (result.type === 'sold' && property.badge !== 'Sold Out') return { type: 'sold', label: 'Master Stock ขึ้นว่าขายแล้ว',
    title: `${result.hit.source}: สถานะ "${result.hit.status}" — กรุณาตรวจสอบสถานะก่อนแก้ไขประกาศ` };
  if (result.type === 'ambiguous' || result.type === 'mismatch') return { type: result.type,
    label: 'ข้อมูลสต๊อกไม่ตรงกัน — ตรวจสอบอีกครั้ง',
    title: 'บ้านเลขที่ ชื่อโครงการ เจ้าของ หรือสถานะมีข้อมูลไม่ตรงกัน จึงยังสรุปว่าขายแล้วหรือไม่มีในสต๊อกไม่ได้' };
  return null;
}
