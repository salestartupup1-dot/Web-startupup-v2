import { fetchPublicDocumentRest, fetchPublicPropertyRest, matchesPropertySlug } from './firestorePublic.js';

// Routing hints only: every completed request still reads a fresh house/price.
export function createPropertyReader({ lookup = fetchPublicPropertyRest, readDocument = fetchPublicDocumentRest,
  timeoutMs = 8000, now = Date.now } = {}) {
  const pending = new Map();
  const routes = new Map();
  return function read(slug, { documentId } = {}) {
    const key = slug.trim();
    const pendingKey = JSON.stringify([key, documentId || null]);
    if (pending.has(pendingKey)) return { promise: pending.get(pendingKey), shared: true };
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(Object.assign(new Error('Property read deadline exceeded'), { code: 'TIMEOUT', retryable: true }));
      }, timeoutMs);
    });
    const operation = async () => {
      const options = { signal: controller.signal, cache: 'no-store' };
      const hint = documentId ? { id: documentId, expires: Infinity } : routes.get(key);
      let property;
      if (hint && hint.expires > now()) {
        property = await readDocument(`properties/${encodeURIComponent(hint.id)}`, options);
        if (property && matchesPropertySlug(property, slug)) {
          if (routes.size >= 512) routes.delete(routes.keys().next().value);
          routes.set(key, { id: property.id, expires: now() + 60000 });
          return property;
        }
        routes.delete(key);
      }
      property = await lookup(slug, options);
      if (property && !controller.signal.aborted) {
        if (routes.size >= 512) routes.delete(routes.keys().next().value);
        routes.set(key, { id: property.id, expires: now() + 60000 });
      }
      return property;
    };
    const promise = Promise.race([operation(), deadline]).finally(() => {
      clearTimeout(timer);
      pending.delete(pendingKey);
    });
    pending.set(pendingKey, promise);
    return { promise, shared: false };
  };
}
