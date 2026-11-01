import { getWebsiteData as getPublicData } from '../../lib/websiteData';
import { randomUUID } from 'node:crypto';
import { SHARED_CDN_CACHE } from '../../lib/serverPageData';

export default async function handler(req, res) {
  const requestId = randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').end();
  try {
    const data = await getPublicData({ includeProperties: req.query.view !== 'detail' });
    // A request naming the revision it saw (?v=) gets a response the CDN may share for a few
    // minutes; stock-sheet states can still change within one revision, hence not longer.
    // Never cache an answer for a different revision under that URL.
    if (typeof req.query.v === 'string' && req.query.v && req.query.v === data.version) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      for (const header of ['CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) res.setHeader(header, SHARED_CDN_CACHE);
    }
    res.status(200).json(data);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    console.warn(JSON.stringify({ event: 'public_catalogue_read', requestId,
      code: error.code || 'UNAVAILABLE', upstreamStatus: error.upstreamStatus, retryable: error.retryable !== false }));
    res.status(503).json({ error: 'Public catalogue temporarily unavailable', requestId,
      code: error.code === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED' : 'UNAVAILABLE', retryable: error.retryable !== false });
  }
}
