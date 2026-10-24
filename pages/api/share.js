import { readSeoProperty, privateResponse } from '../../lib/serverPageData';
import { getPropertyPath } from '../../lib/seo';
import { withCanonicalPropertyPath } from '../../lib/propertyShortLinks';

// Legacy links remain valid for people, Google and social preview crawlers alike.
export default async function handler(req, res) {
  privateResponse(res);
  const slug = Array.isArray(req.query.property) ? req.query.property[0] : req.query.property;
  if (!slug) return res.redirect(307, '/');
  try {
    const property = await readSeoProperty(slug).promise;
    if (!property) return res.status(404).send('Property not found');
    const params = new URLSearchParams(req.url.split('?')[1] || '');
    params.delete('property');
    const suffix = params.toString();
    return res.redirect(308, getPropertyPath(await withCanonicalPropertyPath(property)) + (suffix ? `?${suffix}` : ''));
  } catch {
    res.setHeader('Retry-After', '60');
    return res.status(503).send('Property data temporarily unavailable. Please retry.');
  }
}
