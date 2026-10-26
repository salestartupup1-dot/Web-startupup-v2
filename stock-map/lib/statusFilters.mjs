// สถานะจากชีตพาร์ทเนอร์ (กำลังปรับปรุง, เร่งขาย, ติดจอง ฯลฯ) อยู่ติดกับสถานะกลุ่มเดียวกันของ Master Stock
const STATUS_ORDER = [
  'ยังไม่เสร็จ', 'กำลังปรับปรุง', 'รอเข้าปรับปรุง',
  'ว่าง', 'เร่งขาย', 'บ้านมาใหม่',
  'ติดจอง', 'ยื่นกู้', 'ยื่นซ้อนได้', 'ประเมิน', 'รอโอน',
];

export const houseStatus = house => String(house.rawStatus || '').trim() || 'ไม่ระบุสถานะ';

export function statusOptions(zones = []) {
  const options = new Map();
  for (const zone of zones) for (const project of zone.projects) for (const house of project.houses) {
    const key = houseStatus(house);
    const option = options.get(key) || { key, group: house.group, count: 0 };
    option.count += 1;
    options.set(key, option);
  }
  const rank = key => STATUS_ORDER.includes(key) ? STATUS_ORDER.indexOf(key) : STATUS_ORDER.length;
  return [...options.values()].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key, 'th'));
}

// null includes all current and future statuses; [] deliberately includes none.
export const matchesStatus = (house, selected) => selected === null || selected.includes(houseStatus(house));

export function toggleStatus(selected, key, options) {
  const keys = options.map(option => option.key);
  const next = new Set(selected === null ? keys : selected.filter(value => keys.includes(value)));
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return keys.every(value => next.has(value)) ? null : [...next];
}

export function isStatusGroup(selected, group, options) {
  const keys = options.filter(option => option.group === group).map(option => option.key);
  return selected !== null && keys.length > 0 && selected.length === keys.length && keys.every(key => selected.includes(key));
}
