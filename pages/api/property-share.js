import { propertyShortLinks } from '../../lib/propertyShortLinks';
import { privateResponse } from '../../lib/serverPageData';

export default async function handler(req, res) {
  privateResponse(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const path = await propertyShortLinks.create(req.body?.propertyId);
    return res.status(200).json({ path });
  } catch (error) {
    const status = [400, 404].includes(error.status) ? error.status : 503;
    if (status === 503) res.setHeader('Retry-After', '60');
    return res.status(status).json({ error: status === 404 ? 'Property not found' : 'Unable to create short link' });
  }
}
