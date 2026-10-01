import { getPublicData } from '../../lib/publicDataCache';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  try {
    const data = await getPublicData();
    res.status(200).json(data);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String(error.message || error) });
  }
}
