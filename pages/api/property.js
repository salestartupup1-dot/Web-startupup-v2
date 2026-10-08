import { fetchPublicPropertyRest } from '../../lib/firestorePublic.js';

// Public reads use the same Firestore rules as before; no admin credentials or cache.
export const createPropertyHandler = ({ lookup = fetchPublicPropertyRest, timeoutMs = 8000 } = {}) => async (req, res) => {
  for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) res.setHeader(name, 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const slug = req.query.property;
  if (typeof slug !== 'string' || !slug.trim() || slug.length > 500) {
    return res.status(400).json({ error: 'Invalid property' });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const property = await lookup(slug, { signal: controller.signal });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    return res.status(200).json({ property });
  } catch (error) {
    console.warn('Public property read unavailable:', error.message);
    return res.status(503).json({ error: 'Property temporarily unavailable' });
  } finally {
    clearTimeout(timeout);
  }
};

export default createPropertyHandler();
