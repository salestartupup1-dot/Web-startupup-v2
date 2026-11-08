import test from 'node:test';
import assert from 'node:assert/strict';
import { pathumTitle, pathumDescription, pathumIntro, pathumFaq } from '../lib/pathumCopy.js';
import { locationFaq } from '../lib/locationFaq.js';
import { SEO_LOCATIONS } from '../lib/seoLocations.js';

const house = (price, category = 'ทาวน์เฮาส์') => ({ price, category });
const market = houses => {
  const prices = houses.map(h => h.price);
  return { houses, count: houses.length, pricedCount: prices.length, min: Math.min(...prices), max: Math.max(...prices) };
};
const today = market([house(1690000), house(2090000), house(2690000, 'บ้านแฝด'), house(4490000, 'บ้านเดี่ยว 2 ชั้น')]);

test('title, description and opening paragraph take their numbers from the houses on the page', () => {
  assert.equal(pathumTitle(today), 'บ้านมือสองรีโนเวท ปทุมธานี 4 หลัง เริ่ม 1.69 ล้าน');
  assert.ok(pathumDescription(today).includes('4 หลัง ราคา 1.69–4.49 ล้านบาท'));
  const [first, second, third] = pathumIntro(today);
  assert.ok(first.startsWith('Startup Up Real Estate รวบรวมบ้านมือสอง'));
  assert.ok(first.includes('ตอนนี้มีบ้านเปิดขาย 4 หลัง ราคาตั้งแต่ 1,690,000 ถึง 4,490,000 บาท มีทั้งทาวน์เฮาส์ บ้านแฝด และบ้านเดี่ยว'));
  assert.ok(second.includes('ต.คลองสาม อ.คลองหลวง')); assert.ok(third.includes('062-478-2426'));
  assert.ok(pathumIntro(market([house(1990000)]))[0].endsWith('ราคา 1,990,000 บาท เป็นทาวน์เฮาส์'), 'only types that exist are named');
});

test('FAQ follows the work order wording with live prices and a computed payment example', () => {
  const faq = pathumFaq(today);
  assert.deepEqual(faq.map(([q]) => q), ['บ้านมือสองรีโนเวทในปทุมธานีราคาเท่าไร?', 'มีบ้านในทำเลไหนบ้าง?', 'ผ่อนเดือนละเท่าไร?', 'นัดชมบ้านได้อย่างไร?', 'ช่วยยื่นกู้ซื้อบ้านไหม?']);
  assert.equal(faq[0][1], 'บ้านที่เปิดขายกับ Startup Up ในปทุมธานีตอนนี้ราคาตั้งแต่ 1,690,000 ถึง 4,490,000 บาท ทาวน์เฮาส์เริ่มต้น 1,690,000 บาท ราคาของแต่ละหลังแสดงไว้บนหน้ารายละเอียดบ้าน');
  assert.ok(faq[2][1].includes('ทาวน์เฮาส์ราคา 2,090,000 บาท ผ่อนประมาณ 7,482 บาทต่อเดือน'));
  assert.equal(faq[4][1], 'ช่วย ทีมงานช่วยเตรียมเอกสารและยื่นสินเชื่อบ้าน และดูแลจนถึงวันโอน');
});

test('the Pathum page uses this FAQ (the same array feeds the page and the FAQPage JSON-LD), other pages keep theirs', () => {
  const pathum = SEO_LOCATIONS.find(l => l.copy === 'pathum');
  assert.equal(locationFaq(pathum, [])[0][0], 'บ้านมือสองรีโนเวทในปทุมธานีราคาเท่าไร?');
  assert.ok(locationFaq(pathum, [])[0][1].startsWith('ตอนนี้ยังไม่มีบ้านที่เปิดขาย'), 'no invented prices without stock');
  assert.equal(pathumTitle({ count: 0, min: null }), null, 'falls back to the fixed title without stock');
  const khlong = SEO_LOCATIONS.find(l => l.name === 'คลองหลวง');
  assert.equal(locationFaq(khlong, [])[0][0], 'บ้านมือสองคลองหลวงราคาเท่าไร?');
});
