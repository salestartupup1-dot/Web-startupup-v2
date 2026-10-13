import test from 'node:test';
import assert from 'node:assert/strict';
import { createHighlightStatusCache } from '../lib/highlightStatusCache.mjs';

test('another instance reuses the shared summary; TTL expiry rebuilds it', async () => {
  const values = new Map(); let scans = 0, time = 1;
  const make = () => createHighlightStatusCache({ now: () => time,
    store: { get: async key => values.get(key), set: async (key, data) => values.set(key, data) },
    load: async () => ({ statuses: { a: ++scans } }),
  });
  assert.equal((await make()()).statuses.a, 1);
  assert.equal((await make()()).statuses.a, 1); assert.equal(scans, 1);
  time += 3600001;
  assert.equal((await make()()).statuses.a, 2);
});
test('failed refresh rejects instead of turning unknown houses into missing houses', async () => {
  const read = createHighlightStatusCache({ store: { get: async () => undefined }, load: async () => { throw new Error('quota'); } });
  await assert.rejects(read(), /quota/); await assert.rejects(read(), /quota/);
});
