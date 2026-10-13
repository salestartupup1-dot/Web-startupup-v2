import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicDataCache } from '../lib/publicDataCache.js';
import { createPublicDataWrites } from '../lib/publicDataWrites.js';
import { createCatalogueCoordinator } from '../lib/catalogueCoordinator.js';
import { cachedLeadSummary } from '../lib/leadSummaryCache.js';
import { PUBLIC_SECTIONS, publicSectionVersion } from '../lib/publicDataVersion.js';
import { quotaDay } from '../lib/firestoreQuota.mjs';

function database() {
  const values = new Map(); let queue = Promise.resolve();
  const ref = key => ({ key, get: async () => ({ data: () => values.get(key) }) });
  const db = { collection: name => ({ doc: id => ref(`${name}/${id}`) }),
    runTransaction: work => {
      const task = queue.then(() => work({ get: r => r.get(),
        set: (r, v, options) => values.set(r.key, options?.merge ? { ...values.get(r.key), ...v } : v) }));
      queue = task.catch(() => {}); return task;
    } };
  return { db, values };
}

test('ten cold instances build only one catalogue; loss of runtime cache reuses durable snapshot', async () => {
  const { db } = database(); let scans = 0;
  const coordinator = () => createCatalogueCoordinator({ database: async () => db, sleep: () => new Promise(r => setTimeout(r, 2)) });
  const load = async () => { scans++; return [{ price: 2000000 }]; };
  const results = await Promise.all(Array.from({ length: 10 }, () => coordinator()('properties:v1', load)));
  assert.equal(scans, 1); assert.equal(results.length, 10);
  assert.equal((await coordinator()('properties:v1', load))[0].price, 2000000);
  assert.equal(scans, 1);
  assert.equal((await coordinator()('properties:v2', async () => { scans++; return [{ price: 1500000 }]; }))[0].price, 1500000);
  assert.equal(scans, 2);
});

test('failed rebuild releases its lease and never returns the previous revision', async () => {
  const { db } = database(); const read = createCatalogueCoordinator({ database: async () => db });
  await read('properties:old', async () => [{ price: 2 }]);
  await assert.rejects(read('properties:new', async () => { throw new Error('offline'); }), /offline/);
  assert.equal((await read('properties:new', async () => [{ price: 1 }]))[0].price, 1);
});

test('popup saves do not reread houses; property saves and legacy saves still invalidate prices', async () => {
  let time = 1, scans = 0, price = 2;
  let marker = { updatedAt: '1', scopedAt: '1', sections: Object.fromEntries(PUBLIC_SECTIONS.map(s => [s, '1'])) };
  const shared = new Map();
  const read = createPublicDataCache({ sharedCache: { get: async k => shared.get(k), set: async (k,v) => shared.set(k,v) },
    readDocument: async path => path.endsWith('public_version') ? marker : { value: time },
    readCollection: async () => { scans++; return [{ price }]; } });
  await read();
  marker = { ...marker, updatedAt: '2', scopedAt: '2', sections: { ...marker.sections, popup: '2' } }; time++;
  assert.equal((await read()).popup.value, 2); assert.equal(scans, 1);
  marker = { ...marker, updatedAt: '3', scopedAt: '3', sections: { ...marker.sections, properties: '3' } }; price = 1;
  assert.equal((await read()).properties[0].price, 1); assert.equal(scans, 2);
  marker = { ...marker, updatedAt: '4' }; price = 0.5;
  assert.equal((await read()).properties[0].price, 0.5); assert.equal(scans, 3);
});

test('detail configuration never reads the catalogue', async () => {
  const read = createPublicDataCache({ readDocument: async () => ({ version: 'v1' }),
    readCollection: async () => { throw new Error('unnecessary scan'); } });
  assert.equal((await read({ includeProperties: false })).properties, undefined);
});

test('modern save repairs a legacy marker before applying scoped invalidation', async () => {
  let marker = { updatedAt: 'old-admin-write', scopedAt: 'older', sections: { properties: 'old-price' } };
  const write = createPublicDataWrites({ db: {}, appId: 'test', doc: (_db, path) => ({ path }), sdk: {}, serverTimestamp: () => 'now',
    runTransaction: async (_db, work) => work({ get: async () => ({ data: () => marker }),
      set: (ref, data) => { if (ref.path.endsWith('public_version')) marker = data; } }) });
  await write.setDoc({ path: 'artifacts/test/public/data/site_settings/popup' }, { image: 'new' });
  assert.equal(publicSectionVersion(marker, 'properties'), 'now');
  assert.equal(publicSectionVersion(marker, 'popup'), 'now');
});

test('lead pagination and channel filters reuse exact totals; a new visit invalidates them', async () => {
  const { db, values } = database(); let scans = 0;
  const range = { start: '2026-10-01', end: '2026-10-13' };
  const load = async () => ({ total: ++scans });
  assert.equal((await cachedLeadSummary(db, range, load)).total, 1);
  assert.equal((await cachedLeadSummary(db, { ...range, platform: 'facebook' }, load)).total, 1);
  assert.equal(scans, 1);
  values.set('website_read_snapshots_private/lead_revision', { version: 'changed' });
  assert.equal((await cachedLeadSummary(db, range, load)).total, 2);
});

test('45k guard blocks uncached report scans but retains an already computed summary', async () => {
  const { db, values } = database(); let scans = 0;
  const range = { start: '2026-10-01', end: '2026-10-13' };
  const load = async () => ({ total: ++scans });
  await cachedLeadSummary(db, range, load);
  values.set('website_read_snapshots_private/quota_budget', { day: quotaDay(), reads: 45000 });
  assert.equal((await cachedLeadSummary(db, range, load)).total, 1);
  await assert.rejects(cachedLeadSummary(db, { ...range, start: '2026-09-01' }, load), { status: 503 });
  assert.equal(scans, 1);
});
