import { fetchMasterStockIndex } from '../../lib/masterStock.js';
import { requireSiteAdmin } from '../../lib/siteAdminAuth.js';

// อ่าน Google Sheet ไม่กินโควตาอะไร แคชสั้นๆ พอกันการยิงซ้ำถี่ๆ จะได้เห็นสต๊อกเกือบสด
const CACHE_TTL_MS = 60 * 1000;
let cache = { at: 0, payload: null };

export default async function handler(req, res) {
  // สต๊อกภายใน (รวมของพาร์ทเนอร์และบ้านที่ยังไม่ลงเว็บ) — ให้เฉพาะ admin/host ที่ล็อกอินแล้ว
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  try {
    await requireSiteAdmin(req);
  } catch (error) {
    if (!error.status) console.error('stock-check auth failed', error.code || 'internal');
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'ตรวจสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง' });
  }

  const force = req.query.refresh === '1';
  const isFresh = cache.payload && Date.now() - cache.at < CACHE_TTL_MS;

  try {
    if (force || !isFresh) {
      cache = { at: Date.now(), payload: { ...(await fetchMasterStockIndex()), updatedAt: new Date().toISOString() } };
    }
    res.status(200).json(cache.payload);
  } catch (error) {
    // มีข้อมูลเก่าอยู่ก็ส่งไปก่อน ดีกว่าให้หลังบ้านไม่เห็นสถานะอะไรเลย
    if (cache.payload) {
      res.status(200).json({ ...cache.payload, stale: true, error: String(error.message || error) });
      return;
    }
    res.status(502).json({ error: String(error.message || error) });
  }
}
