import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebsiteDataReader } from '../lib/websiteData.js';

const house = { id: 'house', property_owner: 'Startup Up', project_name: 'พฤกษา 93', house_number: '99/118', price: 2090000 };
const inventory = status => ({ coveredOwners: ['Startup Up'], rows: [{ owner: 'Startup Up', project: 'พฤกษา 93', key: '99/118', sold: status === 'ขายแล้ว', status }] });

test('reuse derived catalogue work only after fresh source checks, including concurrent requests', async () => {
  let data = { properties: [house], version: 'one' }, stock = inventory('ว่าง');
  let reads = 0, stockReads = 0, preparations = 0, fail = false;
  const read = createWebsiteDataReader({
    readData: async () => { reads++; if (fail) throw new Error('revision unavailable'); return data; },
    readStock: async () => { stockReads++; return stock; },
    canonicalize: async properties => { preparations++; return properties.map(p => ({ ...p, canonicalPath: '/99-118' })); },
  });
  const results = await Promise.all(Array.from({ length: 20 }, () => read()));
  assert.equal(reads, 20); assert.equal(stockReads, 20); assert.equal(preparations, 1);
  assert.equal(results[0].properties[0].inventoryState, 'available');
  data = { ...data, version: 'company-update', company: { phone: 'new phone' } };
  assert.equal((await read()).company.phone, 'new phone');
  assert.equal(preparations, 1);
  data = { ...data, version: 'price-update', properties: [{ ...house, price: 1990000 }] };
  assert.equal((await read()).properties[0].price, 1990000);
  assert.equal(preparations, 2);
  stock = inventory('ขายแล้ว');
  assert.equal((await read()).properties[0].inventoryState, 'sold');
  stock = null;
  assert.equal((await read()).properties[0].inventoryState, 'unknown');
  fail = true;
  await assert.rejects(read(), /revision unavailable/);
});

test('detail-only reads avoid stock and a failed preparation can be retried', async () => {
  const data = { properties: [house] };
  let fail = true, stockReads = 0;
  const read = createWebsiteDataReader({
    readData: async options => options.includeProperties === false ? { company: { name: 'Company' } } : data,
    readStock: async () => { stockReads++; return null; },
    canonicalize: async properties => { if (fail) throw new Error('routing unavailable'); return properties; },
  });
  assert.deepEqual(await read({ includeProperties: false }), { company: { name: 'Company' } });
  assert.equal(stockReads, 0);
  await assert.rejects(read(), /routing unavailable/);
  fail = false;
  assert.equal((await read()).properties[0].price, house.price);
});
