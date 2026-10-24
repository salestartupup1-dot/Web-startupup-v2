import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyShortLinks, SHORT_CODES, SHORT_IDS } from '../lib/propertyShortLinks.js';

function database() {
  const rows = new Map(); let writes = 0, queue = Promise.resolve();
  const snapshot = key => ({ exists: rows.has(key), data: () => rows.get(key) });
  const ref = key => ({ key, get: async () => snapshot(key) });
  const db = {
    collection: name => ({ doc: id => ref(`${name}/${id}`) }), doc: ref,
    runTransaction: callback => {
      const run = queue.then(async () => {
        const staged = [];
        const result = await callback({ get: async r => snapshot(r.key), create: (r, value) => staged.push([r.key, value]) });
        for (const [key] of staged) assert.ok(!rows.has(key));
        for (const [key, value] of staged) { rows.set(key, value); writes++; }
        return result;
      });
      queue = run.catch(() => {}); return run;
    },
  };
  const house = id => rows.set(`artifacts/startup-up-realestate/public/data/properties/${id}`, { project_name: 'Project', house_number: '34/74' });
  return { db, rows, house, writes: () => writes };
}

test('six-character links remain stable across copies and independent server instances', async () => {
  const store = database(); store.house('houseA');
  const links = createPropertyShortLinks({ database: async () => store.db, makeCode: () => 'a123bc' });
  assert.equal(await links.create('houseA'), '/a123bc');
  assert.equal(await links.create('houseA'), '/a123bc');
  const otherServer = createPropertyShortLinks({ database: async () => store.db });
  assert.equal(await otherServer.resolve('a123bc'), 'houseA');
  assert.equal(await otherServer.create('houseA'), '/a123bc');
  assert.equal(store.writes(), 2);
});

test('collisions retry atomically without reassigning old links, even after a house is deleted', async () => {
  const store = database(); store.house('houseA'); store.house('houseB');
  const candidates = ['a123bc', 'a123bc', 'b456de'];
  const links = createPropertyShortLinks({ database: async () => store.db, makeCode: () => candidates.shift() });
  assert.equal(await links.create('houseA'), '/a123bc');
  store.rows.delete('artifacts/startup-up-realestate/public/data/properties/houseA');
  assert.equal(await links.create('houseB'), '/b456de');
  assert.equal(await links.resolve('a123bc'), 'houseA');
  assert.equal(await links.resolve('b456de'), 'houseB');
});

test('simultaneous requests for the same house reserve only one link', async () => {
  const store = database(); store.house('houseA'); let code = 0;
  const links = createPropertyShortLinks({ database: async () => store.db, makeCode: () => (++code).toString(16).padStart(6, '0') });
  const results = await Promise.all(Array.from({ length: 5 }, () => links.create('houseA')));
  assert.equal(new Set(results).size, 1); assert.equal(store.writes(), 2);
});

test('invalid IDs, missing houses and exhausted collisions never create wrong destinations', async () => {
  const store = database(); store.house('houseA');
  const links = createPropertyShortLinks({ database: async () => store.db, makeCode: () => 'a123bc' });
  await assert.rejects(links.create('../x'), { status: 400 });
  await assert.rejects(links.create('missing'), { status: 404 });
  assert.equal(store.writes(), 0);
  store.rows.set(`${SHORT_CODES}/a123bc`, { propertyId: 'other' });
  await assert.rejects(links.create('houseA'), { status: 503 });
  assert.equal(store.rows.has(`${SHORT_IDS}/houseA`), false);
  assert.equal(await links.resolve('ffffff'), null);
  assert.equal(await links.resolve('//evil'), null);
});
