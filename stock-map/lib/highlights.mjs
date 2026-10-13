export const MAX_HIGHLIGHTS = 4000;
export const normalizeHousePart = value => String(value ?? '').normalize('NFC').trim().toLowerCase().replace(/[\s\u200b-\u200d\ufeff*]+/gu, '');
export const houseIdentity = house => [normalizeHousePart(house.project), normalizeHousePart(house.houseNumber)];
export const highlightKey = house => JSON.stringify(houseIdentity(house));
export const hasHighlights = (override, website) => highlightLines(effectiveHighlights(override, website)).length > 0;
export async function highlightId(house) {
  const parts = houseIdentity(house);
  if (parts.some(part => !part || part.length > 300)) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parts)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
// Source spelling is independent of the persisted custom-highlight identity.
const websiteProjectKey = value => normalizeHousePart(value)
  .replace(/^โครงการ/u, '').replace(/^ไทยสมบรูณ์(?=\d|$)/u, 'ไทยสมบูรณ์');
// Keep the two numeric address parts intact: 37-1331 and 37/1331 are
// equivalent, but 371/331 is another unit. Never change saved override IDs.
export const websiteHouseNumberKey = value => normalizeHousePart(value)
  .replace(/^(\d+)[\-–—／](\d+)$/u, '$1/$2');
export function websiteHouseNumberVariants(value) {
  const number = websiteHouseNumberKey(value);
  const variants = [String(value ?? '').trim(), number];
  if (/^\d+\/\d+$/u.test(number)) {
    for (const separator of ['-', '–', '—', '／']) variants.push(number.replace('/', separator));
  }
  return [...new Set(variants)].filter(Boolean);
}
// These abbreviated source names were verified against each listing's address.
// Scope to the specific document and unit; never alias a generic brand globally.
const verifiedWebsiteAliases = [
  { project: 'เอื้ออาทรคลองสาม', number: '33/345', sourceProject: 'บ้านเอื้ออาทร', id: '9L7Y7reXX6zEb9feVRqN' },
  { project: 'พลีโน่ รังสิตคลอง 4', number: '88/383', sourceProject: 'พลีโน่', id: 'WgBuvAZucfHxB1xcgquD' },
];
export function matchWebsiteHouse(house, properties) {
  const project = websiteProjectKey(house.project), number = websiteHouseNumberKey(house.houseNumber);
  if (!project || !number) return null;
  const matches = properties.filter(p => websiteHouseNumberKey(p.houseNumber) === number && (
    websiteProjectKey(p.project) === project || verifiedWebsiteAliases.some(alias =>
      websiteProjectKey(alias.project) === project && alias.number === number &&
      alias.id === p.id && websiteProjectKey(alias.sourceProject) === websiteProjectKey(p.project))
  ));
  return matches.length === 1 ? matches[0] : null;
}
export function highlightLines(text) {
  return String(text || '').split(/\r?\n/).map(s => s.trim().replace(/^[•·\-–]+\s*/u, '')).filter(s => s && !/^(?:👉\s*)?จุดเด่น\s*:?$/u.test(s));
}
export function effectiveHighlights(override, website) {
  return override?.mode === 'custom' ? override.text : website || '';
}
export function nextHighlight(override, revision, house, mode, text, updatedAt) {
  if ((override?.revision || 0) !== revision) throw new Error('ข้อมูลถูกแก้ไขจากอีกเครื่องแล้ว กรุณายกเลิกและเปิดแก้ไขใหม่');
  if (!['custom', 'website'].includes(mode) || typeof text !== 'string' || text.length > MAX_HIGHLIGHTS) throw new Error('จุดเด่นต้องไม่เกิน 4,000 ตัวอักษร');
  const [project, houseNumber] = houseIdentity(house);
  return { project, houseNumber, mode, text: mode === 'website' ? '' : text.trim(), revision: revision + 1, updatedAt };
}
