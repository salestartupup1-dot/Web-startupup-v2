import { getPublicData } from '../../lib/publicDataCache';
import { randomUUID } from 'node:crypto';

export default async function handler(req, res) {
  const requestId = randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  try {
    const data = await getPublicData();
    res.status(200).json(data);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    console.warn(JSON.stringify({ event: 'public_catalogue_read', requestId,
      code: error.code || 'UNAVAILABLE', upstreamStatus: error.upstreamStatus, retryable: error.retryable !== false }));
    res.status(503).json({ error: 'Public catalogue temporarily unavailable', requestId,
      code: error.code === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED' : 'UNAVAILABLE', retryable: error.retryable !== false });
  }
}
