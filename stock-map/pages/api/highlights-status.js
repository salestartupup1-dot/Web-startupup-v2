import { createHighlightStatusCache, highlightStatusStore } from '../../lib/highlightStatusCache.mjs';
import { fetchStockRows, selectOwnedActive } from '../../lib/stock';
import { buildHighlightStatuses, fetchHighlightProperties } from '../../lib/highlightSummary.mjs';

async function readStatus() {
  const checkedAt = new Date().toISOString();
  const [houses, properties] = await Promise.all([fetchStockRows().then(selectOwnedActive), fetchHighlightProperties()]);
  const statuses = await buildHighlightStatuses(houses, properties);
  return { statuses, checkedAt };
}
const readCachedStatus = createHighlightStatusCache({ load: readStatus, store: highlightStatusStore });
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').end();
  res.setHeader('Cache-Control', 'no-store');
  try {
    // ?refresh=1 comes from the "check again" button: re-read sheet and saved highlights now.
    return res.status(200).json(await readCachedStatus({ force: req.query.refresh === '1' }));
  } catch {
    return res.status(503).json({ error: 'ตรวจสอบจุดเด่นไม่สำเร็จ กรุณาลองใหม่' });
  }
}
