import { randomUUID } from 'node:crypto';
import { createPropertyReader } from '../../lib/propertyReadService.js';

export const createPropertyHandler = ({ lookup, timeoutMs = 8000, readDocument,
  reader = createPropertyReader({ lookup, readDocument, timeoutMs }),
  log = entry => console[entry.status >= 500 ? 'warn' : 'info'](JSON.stringify(entry)),
} = {}) => async (req, res) => {
  const started = Date.now();
  const requestId = randomUUID();
  for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) res.setHeader(name, 'no-store');
  res.setHeader('X-Request-Id', requestId);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed', requestId });
  }
  const slug = req.query.property;
  if (typeof slug !== 'string' || !slug.trim() || slug.length > 500) {
    return res.status(400).json({ error: 'Invalid property', requestId });
  }
  let status = 503, failure, shared = false;
  try {
    const read = reader(slug);
    shared = read.shared;
    const property = await read.promise;
    status = property ? 200 : 404;
    return res.status(status).json(property
      ? { property, checkedAt: new Date().toISOString(), requestId }
      : { error: 'Property not found', requestId });
  } catch (error) {
    failure = error;
    const retryable = error.retryable !== false;
    if (retryable) res.setHeader('Retry-After', '1');
    return res.status(status).json({ error: 'Property temporarily unavailable', retryable, requestId });
  } finally {
    // Do not record price, customer data, credentials, or raw upstream messages/URLs.
    log({ event: 'public_property_read', time: new Date().toISOString(), requestId,
      property: slug.slice(0, 100), status, durationMs: Date.now() - started, shared,
      ...(failure ? { code: failure.code || failure.name || 'UNKNOWN',
        upstreamStatus: failure.upstreamStatus, retryable: failure.retryable !== false } : {}) });
  }
};

export default createPropertyHandler();
