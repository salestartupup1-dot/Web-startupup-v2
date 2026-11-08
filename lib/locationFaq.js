import { locationMarket } from './locationMarket.js';
import { pathumFaq } from './pathumCopy.js';
import { areaFaq } from './locationCopy.js';
export function locationFaq(location, properties = [], now = new Date()) {
  const market = locationMarket(location, properties);
  if (location.copy === 'pathum') return pathumFaq(market);
  if (location.kind) return [
    [`${location.name}มีพร้อมขายกี่หลัง?`, `ขณะนี้มีรายการที่ยืนยันสถานะพร้อมขาย ${market.count} หลัง${market.min !== null ? ` ราคาประกาศตั้งแต่ ${market.min.toLocaleString('th-TH')} ถึง ${market.max.toLocaleString('th-TH')} บาท` : ''} จำนวนนี้อ้างอิงสต็อกบนเว็บไซต์ ไม่รวมบ้านติดจอง ขายแล้ว กำลังรีโนเวท หรือรับจองสำรอง โปรดเปิดหน้าบ้านเพื่อยืนยันรายละเอียดล่าสุดก่อนนัดชม`],
    ...location.faq,
    ['นัดชมบ้านในรายการนี้ได้อย่างไร?', 'เปิดหน้าบ้านแล้วกดโทรหรือ LINE แจ้งชื่อโครงการ เลขที่บ้าน และเวลาที่สะดวก ทีมงานจะตรวจสถานะและยืนยันนัดก่อนเดินทาง'],
  ];
  return areaFaq(location, market, now);
}
