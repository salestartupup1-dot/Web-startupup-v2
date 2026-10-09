import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyReader } from '../lib/propertyReadService.js';
import { firestoreReadError } from '../lib/firestorePublic.js';

test('concurrent readers share only the pending lookup; later readers get new prices', async () => {
  let finish, lookups = 0, reads = 0;
  const reader = createPropertyReader({
    lookup: () => { lookups++; return new Promise(resolve => { finish = resolve; }); },
    readDocument: async () => { reads++; return { id: 'id', custom_id: 'slug', price: 200 }; },
  });
  const first = reader('slug'), second = reader('slug');
  assert.equal(second.shared, true);
  assert.equal(first.promise, second.promise);
  finish({ id: 'id', custom_id: 'slug', price: 100 });
  assert.equal((await first.promise).price, 100);
  const third = reader('slug');
  assert.equal(third.shared, false);
  assert.equal((await third.promise).price, 200);
  assert.equal(lookups, 1); assert.equal(reads, 1);
});

test('routing hints cannot return renamed or deleted houses', async () => {
  let lookupCount = 0;
  const reader = createPropertyReader({
    lookup: async () => ++lookupCount === 1 ? { id: 'old', custom_id: 'slug' } : null,
    readDocument: async () => ({ id: 'old', custom_id: 'renamed' }),
  });
  await reader('slug').promise;
  assert.equal(await reader('slug').promise, null);
  assert.equal(lookupCount, 2);
});

test('expired hints resolve again and failed requests are not cached', async () => {
  let now = 0, count = 0;
  const reader = createPropertyReader({ now: () => now, lookup: async () => {
    count++; if (count === 2) throw new Error('offline');
    return { id: 'id', custom_id: 'slug' };
  }, readDocument: () => assert.fail('expired hint') });
  await reader('slug').promise;
  now = 61000;
  await assert.rejects(reader('slug').promise);
  assert.equal((await reader('slug').promise).id, 'id');
  assert.equal(count, 3);
});

test('deadline also handles an upstream that never settles and releases the shared request', async () => {
  let count = 0;
  const reader = createPropertyReader({ timeoutMs: 5, lookup: async () => {
    if (++count === 1) return new Promise(() => {});
    return null;
  } });
  await assert.rejects(reader('slug').promise, { code: 'TIMEOUT' });
  assert.equal(await reader('slug').promise, null);
});

test('quota and permission errors stop retries; transient upstream failures retain their cause', async () => {
  for (const [status, code, message, expectedCode, retryable] of [
    [429, 'RESOURCE_EXHAUSTED', 'Daily quota exceeded', 'QUOTA_EXCEEDED', false],
    [403, 'PERMISSION_DENIED', 'secret upstream details', 'PERMISSION_DENIED', false],
    [503, 'UNAVAILABLE', 'secret upstream details', 'UNAVAILABLE', true],
  ]) {
    const error = await firestoreReadError(Response.json({ error: { status: code, message } }, { status }), 'read');
    assert.equal(error.code, expectedCode); assert.equal(error.retryable, retryable);
    assert.equal(error.upstreamStatus, status);
    assert.ok(!error.message.includes(message));
  }
});
