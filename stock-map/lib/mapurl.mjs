/**
 * ดึงพิกัดออกจากลิงก์ Google Maps
 *
 * ใช้ร่วมกันระหว่าง lib/geo.js (ตอน runtime) กับ scripts/build-geocache.mjs (ตอน build แคช)
 * ถ้าแยกกันเขียนสองที่แล้วแก้ไม่ครบ พิกัดในแคชกับพิกัดที่หาสดจะไม่ตรงกัน
 *
 * ลำดับความน่าเชื่อถือด้านล่าง "ห้ามสลับ" โดยเฉพาะ @lat,lng ที่ต้องอยู่ท้ายสุดเสมอ:
 * ค่าหลัง @ คือจุดกึ่งกลาง "จอ" ไม่ใช่ตำแหน่งหมุด Google เลื่อนไปทางตะวันตกราว 250-280 ม.
 * เป็นประจำเพื่อเว้นที่ให้แถบข้าง และถ้าลิงก์ถูกก๊อปตอนซูมออก (เช่น 12z) จะเพี้ยนเป็นกิโลเมตร
 */

export const inThailand = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng)
  && lat > 5 && lat < 25 && lng > 90 && lng < 110;

const PAIR = /(-?\d+\.\d+),\+?(-?\d+\.\d+)/g;

const pick = (text, pattern) => {
  const m = String(text).match(pattern);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

const FINDERS = [
  // หมุดของสถานที่จริง — แม่นที่สุด ลิงก์ place/ลิงก์ย่อส่วนใหญ่มีค่านี้
  (text) => pick(text, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/),

  // ลิงก์นำทาง /maps/dir/ต้นทาง/ปลายทาง/@... — ต้องเอา "ปลายทาง" คือคู่พิกัดสุดท้าย
  // คู่แรกคือจุดที่คนกดออกเดินทาง ส่วนค่าหลัง @ เป็นจุดกึ่งกลางระหว่างทาง ผิดทั้งคู่
  (text) => {
    const segment = String(text).match(/\/maps\/dir\/([^@?]*)/);
    if (!segment) return null;
    const pairs = [...segment[1].matchAll(PAIR)]
      .map((m) => [Number(m[1]), Number(m[2])])
      .filter(([lat, lng]) => inThailand(lat, lng));
    return pairs.length ? pairs[pairs.length - 1] : null;
  },

  // พิกัดที่ใส่มาตรงๆ ใน query string
  (text) => pick(text, /[?&](?:q|ll|daddr|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/),

  // ลิงก์ย่อบางอันเด้งไปเป็น /maps/search/13.99,+100.54
  (text) => pick(text, /\/maps\/(?:search|place)\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/),

  // ลิงก์แบบ /maps/search/?api=1&query=13.83,100.75
  (text) => pick(text, /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/),

  // ลิงก์ที่แชร์จากมือถือ (?g_st=ic) เด้งไปเป็น ?q=ชื่อสถานที่ ไม่มีพิกัดใน URL
  // แต่หน้าเว็บมีรูปแผนที่ตัวอย่างที่ center= อยู่ตรงตำแหน่งสถานที่นั้น
  (text) => pick(text, /center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/),

  // ทางเลือกสุดท้าย: จุดกึ่งกลางจอ คลาดเคลื่อนแน่นอนแต่ยังดีกว่าไม่มีหมุดเลย
  (text) => pick(text, /@(-?\d+\.\d+),(-?\d+\.\d+)/),
];

// บางลิงก์ในชีตเป็น ?q=<%20 เยอะๆ>14.04,<%20 เยอะๆ>100.65 — ต้องถอดรหัสและตัดช่องว่างก่อนถึงจะจับได้
const decodeCompact = (text) => {
  try {
    return decodeURIComponent(text).replace(/\s+/g, '');
  } catch {
    return text.replace(/%20/g, '').replace(/\s+/g, '');
  }
};

export const extractCoords = (text) => {
  const raw = String(text || '');
  const candidates = raw.length <= 2000 ? [raw, decodeCompact(raw)] : [raw];

  // วนตามลำดับความน่าเชื่อถือก่อน แล้วค่อยวนแต่ละรูปแบบข้อความ
  // (ถ้าวนกลับกัน @lat,lng ของข้อความดิบจะชนะ !3d/!4d ของข้อความที่ถอดรหัสแล้ว)
  for (const find of FINDERS) {
    for (const candidate of candidates) {
      const coords = find(candidate);
      if (coords && inThailand(coords[0], coords[1])) {
        return [Number(coords[0].toFixed(6)), Number(coords[1].toFixed(6))];
      }
    }
  }
  return null;
};
