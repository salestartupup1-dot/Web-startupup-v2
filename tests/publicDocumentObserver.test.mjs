import test from 'node:test';
import assert from 'node:assert/strict';
import { observePublicDocument } from '../lib/publicDocumentObserver.js';
const tick = () => new Promise(r => setImmediate(r));
test('public revision polling is bounded, visible-only, fresh and stops cleanly', async () => {
  const win = new EventTarget(), page = new EventTarget();
  page.visibilityState = 'visible';
  let poll, aborted, complete, calls = 0;
  const values = [], errors = [];
  win.setInterval = (fn, ms) => { assert.equal(ms, 30000); poll = fn; return 1; };
  win.clearInterval = () => { poll = null; };
  win.setTimeout = () => 2; win.clearTimeout = () => {};
  const stop = observePublicDocument('site_settings/public_version', s => values.push(s.data()), e => errors.push(e), {
    win, page, initial: false,
    read: async (path, options) => {
      calls++; assert.equal(path, 'site_settings/public_version'); assert.equal(options.cache, 'no-store');
      aborted = options.signal;
      return new Promise(resolve => { complete = resolve; });
    },
  });
  assert.equal(calls, 0);
  poll(); poll(); assert.equal(calls, 1);
  complete({ version: 'one' }); await tick(); assert.deepEqual(values, [{ version:'one' }]);
  page.visibilityState = 'hidden'; poll(); assert.equal(calls, 1);
  page.visibilityState = 'visible'; page.dispatchEvent(new Event('visibilitychange')); assert.equal(calls, 2);
  stop(); assert.equal(aborted.aborted, true);
  complete({ version:'late' }); await tick(); assert.equal(values.length, 1);
  win.dispatchEvent(new Event('online')); assert.equal(calls, 2); assert.deepEqual(errors, []);
});
