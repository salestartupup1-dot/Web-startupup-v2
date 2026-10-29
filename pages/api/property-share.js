import { withPropertyLinks } from '../../lib/propertyCanonicalLinks';
import { privateResponse, readSeoProperty } from '../../lib/serverPageData';

export default async function handler(req, res) {
  privateResponse(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const id = req.body?.propertyId;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return res.status(400).json({ error: 'Invalid property' });
    const property = await readSeoProperty(id, { documentId: id }).promise;
    if (!property) return res.status(404).json({ error: 'Property not found' });
    const { sharePath, canonicalPath } = await withPropertyLinks(property);
    return res.status(200).json({ path: sharePath || canonicalPath });
  } catch (error) {
    const status = [400, 404].includes(error.status) ? error.status : 503;
    if (status === 503) res.setHeader('Retry-After', '60');
    return res.status(status).json({ error: status === 404 ? 'Property not found' : 'Unable to create short link' });
  }
}
