import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyHandler } from '../pages/api/property.js';
import { fetchPublicPropertyApi } from '../lib/publicProperty.js';

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
test('public property endpoint reads current data on every request without caching', async () => {
  let price = 2500000;
  const handler = createPropertyHandler({ lookup: async (slug, { signal }) => {
    assert.equal(slug, '24/182'); assert.ok(signal); return { id: 'house', price };
  } });
  const req = { method: 'GET', query: { property: '24/182' } };
  const first = response(); await handler(req, first);
  price = 2300000;
  const second = response(); await handler(req, second);
  assert.equal(first.body.property.price, 2500000); assert.equal(second.body.property.price, 2300000);
  assert.equal(second.code, 200);
  for (const key of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) assert.equal(second.headers[key], 'no-store');
});
test('missing, invalid and unavailable properties stay distinct', async () => {
  for (const [lookup, expected] of [[async () => null, 404], [async () => { throw new Error('offline'); }, 503]]) {
    const res = response(); await createPropertyHandler({ lookup })({ method: 'GET', query: { property: 'x' } }, res);
    assert.equal(res.code, expected); assert.equal(res.body.property, undefined);
  }
  for (const [method, query, expected] of [['POST', { property: 'x' }, 405], ['GET', { property: ['a', 'b'] }, 400], ['GET', {}, 400]]) {
    const res = response(); await createPropertyHandler({ lookup: () => assert.fail('must not read') })({ method, query }, res);
    assert.equal(res.code, expected);
  }
});
test('database deadline aborts and returns unavailable instead of a false missing house', async () => {
  const res = response();
  await createPropertyHandler({ timeoutMs: 5, lookup: (_slug, { signal }) => new Promise((_resolve, reject) =>
    signal.addEventListener('abort', () => reject(new Error('timeout')))) })({ method: 'GET', query: { property: 'x' } }, res);
  assert.equal(res.code, 503);
});
test('browser uses same-origin no-store request and retries a transient failure', async () => {
  let count = 0;
  const property = await fetchPublicPropertyApi('บ้าน 1/2', { fetcher: async (url, opts) => {
    assert.equal(url, '/api/property?property=' + encodeURIComponent('บ้าน 1/2'));
    assert.equal(opts.cache, 'no-store');
    return ++count === 1 ? new Response(null, { status: 503 }) : Response.json({ property: { id: 'fresh', price: 123 } });
  } });
  assert.equal(count, 2); assert.equal(property.price, 123);
});
test('browser never substitutes stale prices on failure and respects cancellation', async () => {
  assert.equal(await fetchPublicPropertyApi('missing', { fetcher: async () => new Response(null, { status: 404 }) }), null);
  await assert.rejects(fetchPublicPropertyApi('offline', { fetcher: async () => new Response(null, { status: 503 }) }));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchPublicPropertyApi('x', { signal: controller.signal, fetcher: () => assert.fail('aborted') }), { name: 'AbortError' });
});
