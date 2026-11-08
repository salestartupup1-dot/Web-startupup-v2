import { monthlyMortgage } from './mortgage.js';

/**
 * Location-page answer box (SEO/AEO work order 11.3) and location-specific FAQ.
 * Facts only: every number, project and sub-area comes from the houses open for sale
 * on that page (locationMarket). Nothing about the area is written from memory.
 */
const PHONE = '062-478-2426';
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const thaiDate = (date = new Date()) => {
  const bangkok = new Date(date.getTime() + 7 * 3600 * 1000);
  return `${bangkok.getUTCDate()} ${THAI_MONTHS[bangkok.getUTCMonth()]} ${bangkok.getUTCFullYear() + 543}`;
};
const thb = value => Math.round(value).toLocaleString('th-TH');
const num = value => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const payment = price => Math.round(monthlyMortgage(price, 3, 40));
const TYPES = [['ทาวน์เฮาส์', /ทาวน์เฮาส์|ทาวน์โฮม/], ['บ้านแฝด', /บ้านแฝด/], ['บ้านเดี่ยว', /บ้านเดี่ยว/]];
const typeOf = house => TYPES.find(([, test]) => test.test(String(house.category || '')))?.[0] || null;
const range = (values, unit = 'บาท', format = thb) => {
  const list = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!list.length) return '';
  return list[0] === list.at(-1) ? `${format(list[0])} ${unit}` : `${format(list[0])}–${format(list.at(-1))} ${unit}`;
};
const median = values => {
  const list = values.filter(value => value > 0).sort((a, b) => a - b);
  return list.length ? list[Math.floor((list.length - 1) / 2)] : null;
};
const tally = values => [...values.reduce((map, value) => value ? map.set(value, (map.get(value) || 0) + 1) : map, new Map())]
  .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'th'));
const cleanProject = name => String(name || '').replace(/^โครงการ\s*/, '').replace(/\s+/g, ' ').trim();

export function locationFacts(market) {
  const houses = market.houses || [];
  const prices = houses.map(house => num(house.price)).filter(value => value !== null);
  const byType = TYPES.map(([name]) => {
    const list = houses.filter(house => typeOf(house) === name);
    return { name, count: list.length, prices: list.map(house => num(house.price)), areas: list.map(house => num(house.area_wah)) };
  }).filter(type => type.count);
  const main = [...byType].sort((a, b) => b.count - a.count)[0] || null;
  return {
    count: houses.length, min: prices.length ? Math.min(...prices) : null, max: prices.length ? Math.max(...prices) : null,
    median: median(prices), byType, main: main && main.count * 2 > houses.length ? main : null,
    projects: tally(houses.map(house => cleanProject(house.project_name))),
    subAreas: tally(houses.map(house => String(house.sub_location || house.subdistrict || '').trim())),
  };
}

/** "บ้านมือสอง<ทำเล> ของ Startup Up Real Estate มี N หลัง (ข้อมูล ณ ...) ราคา ... ผ่อนเริ่มประมาณ ... นัดชมโทร ... หรือ LINE" */
export function locationAnswer(location, market, now = new Date()) {
  const facts = locationFacts(market);
  if (!facts.count || facts.min === null) return '';
  const kind = facts.main ? ` ส่วนใหญ่เป็น${facts.main.name}${range(facts.main.areas, 'ตร.ว.', value => String(value)) ? ` ${range(facts.main.areas, 'ตร.ว.', value => String(value))}` : ''}` : '';
  return `บ้านมือสอง${location.name} ของ Startup Up Real Estate มี ${facts.count} หลัง (ข้อมูล ณ ${thaiDate(now)}) ราคา ${range([facts.min, facts.max])}${kind} ผ่อนเริ่มประมาณ ${thb(payment(facts.min))} บาท/เดือน นัดชมโทร ${PHONE} หรือ LINE`;
}

/** FAQ for รังสิต / คลองหลวง / ธัญบุรี / ลำลูกกา. The page and its FAQPage JSON-LD use this same array. */
export function areaFaq(location, market, now = new Date()) {
  const facts = locationFacts(market);
  const name = location.name;
  const asOf = `ข้อมูล ณ ${thaiDate(now)}`;
  const visit = [`นัดชมบ้าน${name}ได้อย่างไร?`, `โทร ${PHONE} หรือทัก LINE ของ Startup Up แจ้งหลังที่สนใจและวันที่สะดวก ทีมงานจะนัดพาชมบ้านจริง`];
  const loan = ['ช่วยยื่นกู้ซื้อบ้านไหม?', 'ช่วย ทีมงานช่วยเตรียมเอกสารและยื่นสินเชื่อบ้าน และดูแลจนถึงวันโอน'];
  if (!facts.count || facts.min === null) return [
    [`บ้านมือสอง${name}ราคาเท่าไร?`, `ตอนนี้ยังไม่มีบ้านใน${name}ที่เปิดขาย ราคาของแต่ละหลังจะแสดงบนหน้ารายละเอียดบ้านเมื่อเปิดขาย`], visit, loan,
  ];
  const types = facts.byType.map(type => `${type.name} ${type.count} หลัง ราคา ${range(type.prices)}`).join(' ');
  const faq = [[`บ้านมือสอง${name}ราคาเท่าไร?`,
    `บ้านมือสอง${name}ที่เปิดขายกับ Startup Up Real Estate มี ${facts.count} หลัง ราคา${facts.min === facts.max ? ` ${thb(facts.min)} บาท` : `ตั้งแต่ ${thb(facts.min)} ถึง ${thb(facts.max)} บาท`}${facts.byType.length > 1 ? ` แบ่งเป็น${types}` : ''} (${asOf})`]];
  const counted = list => list.map(([label, count]) => `${label} (${count} หลัง)`).join(' ');
  const projects = facts.projects.slice(0, 4);
  if (projects.length > 1) faq.push([`บ้านมือสอง${name}มีในโครงการไหนบ้าง?`,
    `มีบ้านใน ${facts.projects.length} โครงการ ${facts.projects.length > projects.length ? 'โครงการที่มีบ้านมากที่สุดคือ' : 'ได้แก่'} ${counted(projects)} ดูทุกหลังได้ในรายการบนหน้านี้ (${asOf})`]);
  const areas = facts.subAreas.slice(0, 4);
  if (areas.length > 1) faq.push([`บ้านใน${name}อยู่ย่านไหนบ้าง?`,
    `บ้านที่เปิดขายอยู่ใน ${counted(areas)}${facts.subAreas.length > areas.length ? ' และย่านอื่น' : ''} (${asOf})`]);
  faq.push([`ผ่อนบ้าน${name}เดือนละเท่าไร?`,
    `ทุกหลังแสดงค่าผ่อนโดยประมาณ คิดที่ดอกเบี้ย 3% ระยะ 40 ปี หลังราคาต่ำสุด ${thb(facts.min)} บาท ผ่อนประมาณ ${thb(payment(facts.min))} บาทต่อเดือน${facts.median && facts.median !== facts.min ? ` บ้านราคาประมาณ ${thb(facts.median)} บาท ผ่อนประมาณ ${thb(payment(facts.median))} บาทต่อเดือน` : ''} ยอดจริงขึ้นกับธนาคารที่อนุมัติ`]);
  return [...faq, visit, loan];
}
