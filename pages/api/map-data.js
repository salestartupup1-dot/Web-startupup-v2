import { getPublicProperties } from '../../lib/publicDataCache';

// Stock Map consumes the same verified catalogue as the website. Never include
// customer/admin fields, and do not let a CDN retain an obsolete source version.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').end();
  try {
    const properties = await getPublicProperties();
    return res.json({ properties: properties.map(p => ({ id: p.id,
      slug: String(p.custom_id || p.id), project: String(p.project_name || ''),
      houseNumber: String(p.house_number || ''), highlights: String(p.highlights || ''),
      lat: p.lat ?? null, lng: p.lng ?? null })), checkedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(503).json({ error: 'Map source unavailable',
      code: error.code === 'QUOTA_EXCEEDED' ? error.code : 'UNAVAILABLE' });
  }
}
