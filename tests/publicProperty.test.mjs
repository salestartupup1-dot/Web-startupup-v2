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
  }, readDocument: async () => ({ id: 'house', custom_id: '24/182', price }) });
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


test('backoff increases, respects Retry-After and stops on permanent errors', async () => {
  const delays = [];
  let calls = 0;
  const result = await fetchPublicPropertyApi('x', {
    sleep: async delay => delays.push(delay), random: () => 0,
    fetcher: async () => ++calls < 3
      ? Response.json({ retryable: true }, { status: 503, headers: { 'Retry-After': '1' } })
      : Response.json({ property: { id: 'x', price: 123 } }),
  });
  assert.equal(result.price, 123); assert.deepEqual(delays, [1000, 1500]);
  calls = 0;
  await assert.rejects(fetchPublicPropertyApi('x', {
    sleep: () => assert.fail('must not retry quota'),
    fetcher: async () => { calls++; return Response.json({ retryable: false }, { status: 503 }); },
  }));
  assert.equal(calls, 1);
});

test('aborting during backoff makes no further request', async () => {
  const controller = new AbortController();
  let calls = 0;
  const request = fetchPublicPropertyApi('x', { signal: controller.signal,
    fetcher: async () => { calls++; setTimeout(() => controller.abort(), 5); return new Response(null, { status: 503 }); },
  });
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('diagnostic request IDs connect failures to structured logs without leaking upstream data', async () => {
  const logs = [];
  const handler = createPropertyHandler({ log: record => logs.push(record), lookup: async () => {
    throw Object.assign(new Error('private credential'), { code: 'QUOTA_EXCEEDED', upstreamStatus: 429, retryable: false });
  } });
  const res = response(); await handler({ method: 'GET', query: { property: 'x' } }, res);
  assert.equal(res.body.retryable, false);
  assert.equal(logs[0].code, 'QUOTA_EXCEEDED');
  assert.equal(logs[0].upstreamStatus, 429);
  assert.equal(logs[0].requestId, res.headers['X-Request-Id']);
  assert.equal(res.body.requestId, logs[0].requestId);
  assert.ok(!JSON.stringify([res.body, logs]).includes('private credential'));
});
