// Only publish facts supplied with the house. Never infer renovation from photos/status.
export const PROPERTY_EDITORIAL_FIELDS = [
  { key: 'renovation_details', label: 'งานรีโนเวทของบ้านหลังนี้', hint: 'ระบุงานที่ทำจริง และแยกงานที่เสร็จแล้วกับงานที่กำลังทำ หากยังไม่ยืนยันให้เว้นว่าง' },
  { key: 'access_details', label: 'การเดินทางและทางเข้าโครงการ', hint: 'ระบุถนน ซอย และทางเข้าออกที่ตรวจสอบแล้ว ไม่ใส่เวลาเดินทางโดยประมาณที่ยังไม่ได้ตรวจสอบ' },
  { key: 'nearby_places', label: 'สถานที่ใกล้เคียง', hint: 'ระบุชื่อสถานที่จริง หากใส่ระยะทางให้ระบุวิธีวัดและเส้นทางด้วย' },
];

export function propertyEditorialSections(property = {}) {
  return PROPERTY_EDITORIAL_FIELDS.flatMap(({ key, label }) => {
    const value = property[key];
    return typeof value === 'string' && value.trim() ? [{ key, heading: label, text: value.trim() }] : [];
  });
}

// Recognize explicit standalone headings only; never guess a statement's meaning.
export function propertyHighlightBlocks(value) {
  const blocks = [];
  const headings = new Set(['จุดเด่น', 'จุดเด่นของบ้าน', 'สถานที่ใกล้เคียง', 'การเดินทาง', 'งานรีโนเวท', 'รายละเอียดการรีโนเวท']);
  for (const raw of String(value || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { blocks.push(null); continue; }
    const heading = line.replace(/^[👉📍🏡✅\s]+/u, '').replace(/\s*[:：]\s*$/, '');
    if (headings.has(heading)) { blocks.push({ type: 'heading', text: heading }); continue; }
    const bullet = line.match(/^[-•*–]\s*(.+)$/);
    if (!bullet) { blocks.push({ type: 'text', text: line }); continue; }
    const previous = blocks.at(-1);
    if (previous?.type === 'list') previous.items.push(bullet[1]);
    else blocks.push({ type: 'list', items: [bullet[1]] });
  }
  return blocks.filter(Boolean);
}

export function propertyFactSummary(property = {}) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const number = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const location = [...new Set([property.main_location || property.district, property.sub_location || property.subdistrict, property.province].map(text).filter(Boolean))].join(' ');
  const name = [text(property.category), text(property.project_name), property.house_number ? `บ้านเลขที่ ${text(property.house_number)}` : ''].filter(Boolean).join(' ');
  if (!name) return '';
  const facts = [
    number(property.area_wah) && `ที่ดิน ${number(property.area_wah)} ตร.ว.`,
    number(property.area_sqm) && `พื้นที่ใช้สอย ${number(property.area_sqm)} ตร.ม.`,
    number(property.bedrooms) && `${number(property.bedrooms)} ห้องนอน`,
    number(property.bathrooms) && `${number(property.bathrooms)} ห้องน้ำ`,
    number(property.parking) && `ที่จอดรถ ${number(property.parking)} คัน`,
  ].filter(Boolean);
  return `${name}${location ? ` ทำเล${location}` : ''}${facts.length ? ` มี${facts.join(' ')}` : ''}`;
}
