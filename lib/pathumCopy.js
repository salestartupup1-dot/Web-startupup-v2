import { monthlyMortgage } from './mortgage.js';

/**
 * Copy for /บ้านรีโนเวท-ปทุมธานี from Peth's SEO/AEO work order (8 Nov 2026).
 * Wording is Peth's; every count and price comes from the houses open for sale on the page
 * (locationMarket), so the title, H1, opening paragraphs and FAQ never drift from the listing.
 * The FAQ shown on the page and the FAQPage JSON-LD are built from the same array.
 */
const PHONE = '062-478-2426';
const thb = value => value.toLocaleString('th-TH');
// 1690000 -> "1.69", 2000000 -> "2"
const millions = value => String(Number((value / 1e6).toFixed(2)));
const TYPES = [['ทาวน์เฮาส์', /ทาวน์เฮาส์|ทาวน์โฮม/], ['บ้านแฝด', /บ้านแฝด/], ['บ้านเดี่ยว', /บ้านเดี่ยว/]];
const listThai = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(' ')} และ${items.at(-1)}`;
const priceOf = house => Number(String(house.price ?? '').replace(/,/g, ''));
// Example in the payment answer: the same 3% / 40 years the house cards use.
const PAYMENT_EXAMPLE_PRICE = 2090000;

export function pathumFacts(market) {
  const houses = market.houses || [];
  const types = TYPES.filter(([, test]) => houses.some(house => test.test(String(house.category || '')))).map(([name]) => name);
  const townhousePrices = houses.filter(house => TYPES[0][1].test(String(house.category || ''))).map(priceOf).filter(value => value > 0);
  return { ...market, types, townhouseMin: townhousePrices.length ? Math.min(...townhousePrices) : null };
}

export const pathumTitle = market => market.count && market.min !== null
  ? `บ้านมือสองรีโนเวท ปทุมธานี ${market.count} หลัง เริ่ม ${millions(market.min)} ล้าน` : null;

export const pathumDescription = market => market.count && market.min !== null
  ? `บ้านมือสองรีโนเวทพร้อมอยู่ ปทุมธานี รังสิต คลองหลวง ธัญบุรี ลำลูกกา ${market.count} หลัง ราคา ${millions(market.min)}${market.max !== market.min ? `–${millions(market.max)}` : ''} ล้านบาท ช่วยยื่นสินเชื่อ นัดชมทางโทรหรือ LINE`
  : null;

export function pathumIntro(market) {
  const facts = pathumFacts(market);
  const stock = facts.count && facts.min !== null
    ? ` ตอนนี้มีบ้านเปิดขาย ${facts.count} หลัง ราคา${facts.min === facts.max ? ` ${thb(facts.min)}` : `ตั้งแต่ ${thb(facts.min)} ถึง ${thb(facts.max)}`} บาท`
    : '';
  const types = facts.types.length > 1 ? ` มีทั้ง${listThai(facts.types)}` : facts.types.length ? ` เป็น${facts.types[0]}` : '';
  return [
    `Startup Up Real Estate รวบรวมบ้านมือสองที่รีโนเวทใหม่พร้อมเข้าอยู่ในจังหวัดปทุมธานี ทั้งย่านรังสิต คลองหลวง (คลอง 1–3) ธัญบุรี และลำลูกกา${stock}${types}`,
    'ทุกหลังแสดงราคา ขนาดที่ดิน จำนวนห้องนอนและห้องน้ำ และค่าผ่อนโดยประมาณไว้ให้เปรียบเทียบได้ทันที สำนักงานของเราอยู่ที่ ต.คลองสาม อ.คลองหลวง จึงพาชมบ้านจริงในย่านนี้ได้สะดวก',
    `สนใจหลังไหน โทร ${PHONE} หรือทัก LINE ทีมงานช่วยเตรียมเอกสาร ยื่นสินเชื่อ และดูแลจนถึงวันโอน`,
  ];
}

export function pathumFaq(market) {
  const facts = pathumFacts(market);
  const range = facts.min === null ? null : facts.min === facts.max ? `${thb(facts.min)} บาท` : `ตั้งแต่ ${thb(facts.min)} ถึง ${thb(facts.max)} บาท`;
  const payment = Math.round(monthlyMortgage(PAYMENT_EXAMPLE_PRICE, 3, 40));
  return [
    ['บ้านมือสองรีโนเวทในปทุมธานีราคาเท่าไร?', range
      ? `บ้านที่เปิดขายกับ Startup Up ในปทุมธานีตอนนี้ราคา${range}${facts.townhouseMin ? ` ทาวน์เฮาส์เริ่มต้น ${thb(facts.townhouseMin)} บาท` : ''} ราคาของแต่ละหลังแสดงไว้บนหน้ารายละเอียดบ้าน`
      : 'ตอนนี้ยังไม่มีบ้านที่เปิดขายในปทุมธานี ราคาของแต่ละหลังแสดงไว้บนหน้ารายละเอียดบ้านเมื่อเปิดขาย'],
    ['มีบ้านในทำเลไหนบ้าง?', 'มีบ้านในรังสิต คลองหลวง (คลอง 1–3) ธัญบุรี ลำลูกกา และเมืองปทุมธานี ดูแยกตามทำเลได้จากหน้าบ้านมือสองแต่ละทำเล'],
    ['ผ่อนเดือนละเท่าไร?', `ทุกหลังแสดงค่าผ่อนโดยประมาณ คิดที่ดอกเบี้ย 3% ระยะ 40 ปี เช่น ทาวน์เฮาส์ราคา ${thb(PAYMENT_EXAMPLE_PRICE)} บาท ผ่อนประมาณ ${thb(payment)} บาทต่อเดือน ยอดจริงขึ้นกับธนาคารที่อนุมัติ`],
    ['นัดชมบ้านได้อย่างไร?', `โทร ${PHONE} หรือทัก LINE ของ Startup Up แจ้งหลังที่สนใจและวันที่สะดวก ทีมงานจะนัดพาชมบ้านจริง`],
    ['ช่วยยื่นกู้ซื้อบ้านไหม?', 'ช่วย ทีมงานช่วยเตรียมเอกสารและยื่นสินเชื่อบ้าน และดูแลจนถึงวันโอน'],
  ];
}
