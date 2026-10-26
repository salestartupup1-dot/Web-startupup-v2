import { inThailand } from '../../lib/mapurl.mjs';
import { MAX_ROUTE_STOPS } from '../../lib/route.mjs';

// ตำแหน่งปัจจุบัน + บ้านในเส้นทาง
const MAX_POINTS = MAX_ROUTE_STOPS + 1;

/**
 * เวลา/ระยะขับรถตามถนนจริงระหว่างทุกคู่จุด สำหรับปุ่ม "จัดเส้นทางให้สั้นที่สุด"
 * ถามบริการ OSRM แทนเบราว์เซอร์ — หน้าเว็บไม่ต้องเปิดสิทธิ์ต่อเว็บภายนอก
 * และ IP ของคนใช้งานไม่ถูกส่งต่อไปพร้อมตำแหน่ง
 *
 * GET /api/road-costs?points=lat,lng;lat,lng;...
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').end();

  const points = String(req.query.points || '').split(';').map((pair) => pair.split(',').map(Number));
  const valid = points.length >= 2 && points.length <= MAX_POINTS
    && points.every((pair) => pair.length === 2 && inThailand(pair[0], pair[1]));
  if (!valid) return res.status(400).json({ error: 'invalid points' });

  try {
    const coords = points.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
    const response = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`,
      { signal: AbortSignal.timeout(9000), headers: { 'User-Agent': 'startup-up-stock-map' } },
    );
    const data = await response.json();
    if (!response.ok || data.code !== 'Ok') throw new Error(data.message || `OSRM ${response.status}`);
    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    return res.status(200).json({ code: 'Ok', durations: data.durations, distances: data.distances });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'routing unavailable' });
  }
}
