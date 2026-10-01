import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicDataCache } from '../lib/publicDataCache.js';
import { publicDataVersion } from '../lib/publicDataVersion.js';
import { createPublicDataWrites } from '../lib/publicDataWrites.js';
import { subscribePublicData } from '../lib/publicDataSubscription.js';
import { fetchPublicDocumentRest } from '../lib/firestorePublic.js';

function source() {
  let version = 'one', price = 2000000, popup = 'old.png', reads = 0, failure = false;
  const get = createPublicDataCache({
    readDocument: async path => {
      if (failure) throw new Error('offline');
      if (path.endsWith('public_version')) return { version };
      if (path.endsWith('popup')) return { imageUrl: popup, isActive: true };
      return { name: version };
    },
    readCollection: async () => { reads++; return [{ id: 'house', price }]; },
  });
  return { get, get reads() { return reads; }, fail: () => { failure = true; },
    change: () => { version = 'two'; price = 1700000; popup = 'new.png'; } };
}

test('the next request after a save sees the new popup, price, company and visual content', async () => {
  const h = source();
  assert.equal((await h.get()).popup.imageUrl, 'old.png');
  assert.equal((await h.get()).cached, true);
  assert.equal(h.reads, 1);
  h.change();
  const fresh = await h.get();
  assert.equal(fresh.popup.imageUrl, 'new.png');
  assert.equal(fresh.properties[0].price, 1700000);
  assert.equal(fresh.company.name, 'two');
  assert.equal(fresh.visual.name, 'two');
  assert.equal(h.reads, 2);
});

test('concurrent visitors share the same catalogue read', async () => {
  const h = source();
  await Promise.all(Array.from({ length: 30 }, () => h.get()));
  assert.equal(h.reads, 1);
});

test('a failed version check never silently returns a cached price', async () => {
  const h = source();
  await h.get();
  h.fail();
  await assert.rejects(h.get(), /offline/);
});

test('a change while loading retries before publishing a mixed snapshot', async () => {
  let revision = 'one', reads = 0;
  const get = createPublicDataCache({
    readDocument: async path => path.endsWith('public_version') ? { version: revision } : { value: revision },
    readCollection: async () => {
      reads++;
      const price = revision === 'one' ? 2000000 : 1700000;
      revision = 'two';
      return [{ price }];
    },
  });
  assert.equal((await get()).properties[0].price, 1700000);
  assert.equal(reads, 2);
});

test('missing revision does not authorize indefinite cache reuse', async () => {
  let reads = 0;
  const get = createPublicDataCache({ readDocument: async () => null,
    readCollection: async () => { reads++; return []; } });
  await get(); await get();
  assert.equal(reads, 2);
});

test('legacy saves in the same second and saves from old admin tabs invalidate the cache', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ name: 'docs/version',
    fields: { updatedAt: { timestampValue: '2026-10-01T07:51:03.224123Z' } } }));
  const value = await fetchPublicDocumentRest('site_settings/public_version');
  assert.equal(value.updatedAt.nanoseconds, 224123000);
  const base = { version: 'existing-token', updatedAt: { seconds: 42, nanoseconds: 1 } };
  assert.notEqual(publicDataVersion(base), publicDataVersion({ ...base, updatedAt: { seconds: 42, nanoseconds: 2 } }));
});

function writerHarness() {
  const batches = [], privateCalls = [];
  let failure = false, seq = 0;
  const ref = path => ({ path, parent: { path: path.split('/').slice(0, -1).join('/') }, id: path.split('/').pop() });
  const api = createPublicDataWrites({ db: {}, appId: 'test',
    doc: (parent, path) => ref(path || `${parent.path}/new-${++seq}`),
    serverTimestamp: () => 'server-time',
    writeBatch: () => {
      const writes = []; batches.push(writes);
      return Object.fromEntries(['set','update','delete','commit'].map(method => [method,
        (...args) => method === 'commit' ? (failure ? Promise.reject(new Error('denied')) : Promise.resolve())
          : writes.push({ method, args })]));
    },
    sdk: Object.fromEntries(['setDoc','updateDoc','deleteDoc','addDoc'].map(method => [method,
      (...args) => privateCalls.push({ method, args })])),
  });
  return { api, batches, privateCalls, ref: path => ref(`artifacts/test/public/data/${path}`),
    fail: () => { failure = true; } };
}

test('every public save/delete commits content and revision in one batch; users remain separate', async () => {
  const h = writerHarness();
  for (const path of ['site_settings/popup','site_settings/sale_promotion','site_settings/visual','company_info/main','properties/house']) {
    await h.api.setDoc(h.ref(path), { value: 'new' }, { merge: true });
  }
  await h.api.updateDoc(h.ref('properties/house'), { price: 1700000 });
  await h.api.deleteDoc(h.ref('properties/house'));
  const added = await h.api.addDoc(h.ref('properties'), { price: 1500000 });
  assert.match(added.id, /^new-/);
  for (const writes of h.batches) {
    assert.equal(writes.length, 2);
    assert.match(writes[1].args[0].path, /site_settings\/public_version$/);
    assert.equal(writes[1].args[1].updatedAt, 'server-time');
  }
  await h.api.setDoc(h.ref('users/person'), { role: 'pending' });
  assert.equal(h.privateCalls.length, 1);
  assert.equal(h.batches.length, 8);
  h.fail();
  await assert.rejects(h.api.updateDoc(h.ref('properties/house'), { price: 1 }), /denied/);
});

const tick = () => new Promise(resolve => setImmediate(resolve));
function subscriberHarness(load) {
  const win = new EventTarget(), page = new EventTarget(), values = [], errors = [];
  page.visibilityState = 'visible';
  let emit, fail, stopped = false, interval;
  win.setInterval = callback => { interval = callback; return 1; };
  win.clearInterval = () => {};
  const stop = subscribePublicData({ win, page, load, onData: value => values.push(value), onError: e => errors.push(e),
    observe: (options, next, error) => {
      assert.equal(options.includeMetadataChanges, true);
      emit = next; fail = error;
      return () => { stopped = true; };
    },
  });
  return { values, errors, win, stop, fail: () => fail(new Error('offline')), retry: () => interval(),
    emit: (version, metadata = {}) => emit({ exists: () => true, data: () => ({ version }), metadata }),
    get stopped() { return stopped; } };
}

test('open pages reload on a confirmed revision, ignoring local or pending snapshots', async () => {
  let price = 2000000, reads = 0;
  const h = subscriberHarness(async () => { reads++; return { price }; });
  await tick();
  h.emit('one'); await tick();
  price = 1700000;
  const before = reads;
  h.emit('local', { fromCache: true }); h.emit('pending', { hasPendingWrites: true });
  await tick(); assert.equal(reads, before);
  h.emit('two'); await tick();
  assert.equal(h.values.at(-1).price, 1700000);
  h.emit('two'); await tick(); assert.equal(reads, before + 1);
  h.stop(); h.emit('late'); await tick();
  assert.equal(h.stopped, true); assert.equal(reads, before + 1);
});

test('an obsolete response cannot flash an old price after a revision event', async () => {
  const requests = [];
  const h = subscriberHarness(() => new Promise(resolve => requests.push(resolve)));
  h.emit('new');
  requests.shift()({ price: 2000000 }); await tick();
  assert.deepEqual(h.values, []);
  requests.shift()({ price: 1700000 }); await tick();
  assert.deepEqual(h.values, [{ price: 1700000 }]);
  h.stop();
});

test('focus refreshes; a failed listener falls back to retry; cleanup prevents late updates', async () => {
  let reads = 0;
  const h = subscriberHarness(async () => ++reads);
  await tick(); h.win.dispatchEvent(new Event('focus')); await tick();
  assert.equal(reads, 2);
  h.fail(); await tick(); h.retry(); await tick();
  assert.equal(reads, 4);
  h.stop(); h.win.dispatchEvent(new Event('focus')); h.retry(); await tick();
  assert.equal(reads, 4);
});
