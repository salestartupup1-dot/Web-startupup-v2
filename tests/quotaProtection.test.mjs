import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicDataCache } from '../lib/publicDataCache.js';
import { loadPublicCatalogue } from '../lib/publicCatalogueClient.js';
import { subscribePublicData } from '../lib/publicDataSubscription.js';
import { subscribePopup } from '../lib/popupSubscription.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
test('new server instances reuse a shared catalogue only after validating its revision', async () => {
  let version = 'one', price = 2000000, scans = 0, offline = false;
  const values = new Map();
  const sharedCache = { get: async key => values.get(key), set: async (key, value) => values.set(key, value) };
  const create = () => createPublicDataCache({ sharedCache,
    readDocument: async path => {
      if (offline) throw new Error('quota');
      return path.endsWith('public_version') ? { version } : {};
    }, readCollection: async () => { scans++; return [{ id: 'house', price }]; } });
  assert.equal((await create()()).properties[0].price, 2000000);
  assert.equal((await create()()).properties[0].price, 2000000);
  assert.equal(scans, 1);
  version = 'two'; price = 1500000;
  assert.equal((await create()()).properties[0].price, 1500000);
  assert.equal(scans, 2);
  offline = true;
  await assert.rejects(create()(), /quota/);
  assert.equal(scans, 2);
});

test('a save during a shared cache read cannot expose the older price', async () => {
  let version = 'old', scans = 0;
  // Only the old key exists; a new version must fetch the new catalogue.
  let oldRead = true;
  const safe = createPublicDataCache({
    sharedCache: { get: async () => { if (oldRead) { oldRead = false; version = 'new'; return { version: 'old', value: [{ price: 1 }] }; } }, set: async () => {} },
    readDocument: async path => path.endsWith('public_version') ? { version } : {},
    readCollection: async () => { scans++; return [{ price: 2 }]; },
  });
  assert.equal((await safe()).properties[0].price, 2);
  assert.equal(scans, 1);
});

test('cache failure is optional; database failure never serves stale data', async () => {
  const get = createPublicDataCache({ sharedCache: { get: async () => { throw new Error('cache offline'); }, set: async () => { throw new Error('cache offline'); } },
    readDocument: async () => ({ version: 'v' }), readCollection: async () => [{ price: 123 }] });
  assert.equal((await get()).properties[0].price, 123);
});

test('public catalogue makes one request, propagates quota and never starts a full browser scan', async () => {
  let calls = 0;
  await assert.rejects(loadPublicCatalogue({ fetcher: async (url, options) => {
    calls++; assert.equal(url, '/api/public-data'); assert.ok(options.signal); assert.equal(options.cache, 'no-store');
    return Response.json({ code: 'QUOTA_EXCEEDED', retryable: false, requestId: 'r' }, { status: 503 });
  } }), { code: 'QUOTA_EXCEEDED', retryable: false, requestId: 'r' });
  assert.equal(calls, 1);
});

for (const [name, subscribe] of [['catalogue', subscribePublicData], ['popup/promotion', subscribePopup]]) {
  test(`${name} quota errors suppress interval/focus retry storms and recover after cooldown`, async () => {
    const win = new EventTarget(), page = new EventTarget(); page.visibilityState = 'visible';
    let now = 0, interval, reads = 0, next;
    win.setInterval = fn => { interval = fn; return 1; }; win.clearInterval = () => {};
    win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
    const stop = subscribe({ win, page, now: () => now,
      observe: (_options, callback) => { next = callback; return () => {}; },
      load: async () => { reads++; throw Object.assign(new Error('quota'), { retryable: false }); },
      onData: () => {}, onError: () => {},
    });
    await tick();
    for (let i = 0; i < 19; i++) {
      now += 15000; interval(); win.dispatchEvent(new Event('focus')); await tick();
    }
    assert.equal(reads, 1);
    now = 300000; interval(); await tick(); assert.equal(reads, 2);
    next({ exists: () => true, data: () => ({ version: 'restored' }), metadata: {} });
    await tick();
    if (name === 'catalogue') assert.equal(reads, 3, 'confirmed revision can recover immediately');
    stop(); now += 300000; interval(); await tick();
    assert.equal(reads, name === 'catalogue' ? 3 : 2);
  });
}

test('focus/visibility events while a catalogue request is pending do not queue duplicate reads', async () => {
  const win = new EventTarget(), page = new EventTarget(); page.visibilityState = 'visible';
  win.setInterval = () => 1; win.clearInterval = () => {};
  let finish, reads = 0;
  const stop = subscribePublicData({ win, page, observe: () => () => {},
    load: () => { reads++; return new Promise(resolve => { finish = resolve; }); }, onData: () => {}, onError: () => {} });
  win.dispatchEvent(new Event('focus')); page.dispatchEvent(new Event('visibilitychange'));
  finish({ version: 'v' }); await tick();
  assert.equal(reads, 1); stop();
});
