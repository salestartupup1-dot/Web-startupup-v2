// /llms.txt from Peth's SEO/AEO work order (8 Nov 2026, task 7). Plain facts for AI readers;
// the price range and its month come from the houses open for sale in Pathum Thani.
import { SITE_URL } from './seo.js';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const thaiMonthYear = (date = new Date()) => {
  const bangkok = new Date(date.getTime() + 7 * 3600 * 1000);
  return `${THAI_MONTHS[bangkok.getUTCMonth()]} ${bangkok.getUTCFullYear() + 543}`;
};
const thb = value => value.toLocaleString('th-TH');

export function buildLlmsText(market, now = new Date()) {
  const price = market && market.count && market.min !== null
    ? `บ้านที่เปิดขายในปทุมธานีราคา${market.min === market.max ? ` ${thb(market.min)}` : `ตั้งแต่ ${thb(market.min)} ถึง ${thb(market.max)}`} บาท (ข้อมูล ${thaiMonthYear(now)} ดูราคาล่าสุดบนเว็บ)`
    : 'ดูราคาล่าสุดของแต่ละหลังบนเว็บ';
  return `# Startup Up Real Estate

> ขายบ้านมือสองรีโนเวทพร้อมเข้าอยู่ ในจังหวัดปทุมธานี ย่านรังสิต คลองหลวง ธัญบุรี และลำลูกกา
> มีทั้งทาวน์เฮาส์ บ้านแฝด และบ้านเดี่ยว พร้อมช่วยยื่นสินเชื่อและดูแลจนถึงวันโอน

## สิ่งที่เราทำ
- ขายบ้านมือสองที่รีโนเวทใหม่ พร้อมเข้าอยู่
- แสดงราคา ขนาดที่ดิน จำนวนห้อง และค่าผ่อนโดยประมาณของทุกหลังบนเว็บ
- นัดชมบ้านจริง
- ช่วยเตรียมเอกสารและยื่นสินเชื่อบ้าน ดูแลจนถึงวันโอน

## ทำเลที่มีบ้าน
จังหวัดปทุมธานี: รังสิต, คลองหลวง (คลอง 1–3), ธัญบุรี, ลำลูกกา และเมืองปทุมธานี

## ราคา
${price}

## ติดต่อ
โทร: 062-478-2426
LINE: ${SITE_URL}/line/go?via=website
อีเมล: startup.up.real.estate@gmail.com
สำนักงาน: 39/43, 39/44 หมู่ 5 ต.คลองสาม อ.คลองหลวง จ.ปทุมธานี 12120

## หน้าหลัก
- บ้านมือสองรีโนเวท ปทุมธานี: ${SITE_URL}/บ้านรีโนเวท-ปทุมธานี
- บ้านมือสอง รังสิต: ${SITE_URL}/บ้านมือสอง-รังสิต
- บ้านมือสอง คลองหลวง: ${SITE_URL}/บ้านมือสอง-คลองหลวง
- บ้านมือสอง ธัญบุรี: ${SITE_URL}/บ้านมือสอง-ธัญบุรี
- บ้านมือสอง ลำลูกกา: ${SITE_URL}/บ้านมือสอง-ลำลูกกา
- บทความก่อนซื้อบ้าน: ${SITE_URL}/articles
`;
}
