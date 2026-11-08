import test from 'node:test';
import assert from 'node:assert/strict';
import { SEO_LOCATIONS } from '../lib/seoLocations.js';
import { locationMarket } from '../lib/locationMarket.js';
import { locationFaq } from '../lib/locationFaq.js';
import { locationAnswer, areaFaq, thaiDate, locationFacts } from '../lib/locationCopy.js';

const now = new Date('2026-11-08T03:00:00Z');
const rangsit = SEO_LOCATIONS.find(item => item.name === 'รังสิต');
const base = { inventoryState: 'available', district: 'ธัญบุรี', main_location: 'รังสิต' };
const houses = [
  { ...base, id: 'a', category: 'ทาวน์เฮาส์', price: '1,690,000', area_wah: '18', project_name: 'โครงการ พฤกษา 10', sub_location: 'คลอง 3' },
  { ...base, id: 'b', category: 'ทาวน์เฮาส์', price: 1890000, area_wah: 21, project_name: 'พฤกษา 10', sub_location: 'คลอง 3' },
  { ...base, id: 'c', category: 'ทาวน์เฮาส์', price: 2090000, area_wah: 20, project_name: 'ภัสสร 3', sub_location: 'คลอง 4' },
  { ...base, id: 'd', category: 'บ้านเดี่ยว', price: 3590000, area_wah: 50, project_name: 'ภัสสร 3', sub_location: 'คลอง 4' },
  { ...base, id: 'sold', category: 'บ้านเดี่ยว', price: 100, inventoryState: 'sold' },
];

test('Thai date is Bangkok time with Buddhist year', () => {
  assert.equal(thaiDate(now), '8 พ.ย. 2569');
  assert.equal(thaiDate(new Date('2026-11-07T18:00:00Z')), '8 พ.ย. 2569');
});

test('answer box uses only facts from houses open for sale on the page', () => {
  const market = locationMarket(rangsit, houses);
  assert.equal(locationFacts(market).main.name, 'ทาวน์เฮาส์');
  assert.equal(locationAnswer(rangsit, market, now),
    'บ้านมือสองรังสิต ของ Startup Up Real Estate มี 4 หลัง (ข้อมูล ณ 8 พ.ย. 2569) ราคา 1,690,000–3,590,000 บาท ส่วนใหญ่เป็นทาวน์เฮาส์ 18–21 ตร.ว. ผ่อนเริ่มประมาณ 6,050 บาท/เดือน นัดชมโทร 062-478-2426 หรือ LINE');
  assert.equal(locationAnswer(rangsit, locationMarket(rangsit, []), now), '', 'no answer box without stock');
});

test('area FAQ lists real projects, sub-areas and payments; the page and JSON-LD share one array', () => {
  const faq = locationFaq(rangsit, houses, now);
  assert.deepEqual(faq, areaFaq(rangsit, locationMarket(rangsit, houses), now));
  assert.deepEqual(faq.map(([q]) => q), ['บ้านมือสองรังสิตราคาเท่าไร?', 'บ้านมือสองรังสิตมีในโครงการไหนบ้าง?', 'บ้านในรังสิตอยู่ย่านไหนบ้าง?', 'ผ่อนบ้านรังสิตเดือนละเท่าไร?', 'นัดชมบ้านรังสิตได้อย่างไร?', 'ช่วยยื่นกู้ซื้อบ้านไหม?']);
  assert.match(faq[0][1], /มี 4 หลัง ราคาตั้งแต่ 1,690,000 ถึง 3,590,000 บาท แบ่งเป็นทาวน์เฮาส์ 3 หลัง ราคา 1,690,000–2,090,000 บาท บ้านเดี่ยว 1 หลัง ราคา 3,590,000 บาท \(ข้อมูล ณ 8 พ.ย. 2569\)/);
  assert.match(faq[1][1], /^มีบ้านใน 2 โครงการ ได้แก่ พฤกษา 10 \(2 หลัง\) ภัสสร 3 \(2 หลัง\)/);
  assert.match(faq[2][1], /คลอง 3 \(2 หลัง\) คลอง 4 \(2 หลัง\) \(ข้อมูล/);
  assert.match(faq[3][1], /1,690,000 บาท ผ่อนประมาณ 6,050 บาทต่อเดือน บ้านราคาประมาณ 1,890,000 บาท ผ่อนประมาณ 6,766 บาทต่อเดือน/);
  assert.doesNotMatch(faq.map(row => row.join(' ')).join(' '), /100 บาท|undefined|NaN|∞/);
});

test('area FAQ without stock gives no prices', () => {
  const faq = locationFaq(rangsit, [], now);
  assert.equal(faq.length, 3);
  assert.doesNotMatch(faq[0][1], /\d,\d{3},\d{3}/);
});
