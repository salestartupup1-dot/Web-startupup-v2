import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyStockStatus, getPropertyStockAlert } from '../lib/stockMatching.js';
import { fetchMasterStockIndex, MASTER_STOCK_SOURCES } from '../lib/masterStock.js';

const property = (owner = 'Notting', project = 'ทรัพย์ไพศาล', number = '107/122') => ({ property_owner: owner, project_name: project, house_number: number });
const row = (owner = 'Notting', project = 'บ้านทรัพย์ไพศาล', key = '107/122', sold = false) => ({ owner, project, key, sold, status: sold ? 'ขายแล้ว' : 'ว่าง', source: owner });
const stock = rows => ({ rows, coveredOwners: ['Notting', 'Startup Up', 'Naphat', 'เจ๊หมวย'] });

test('Notting matches the real project prefix and does not show a missing warning', () => {
  assert.equal(propertyStockStatus(stock([row()]), property()).type, 'available');
  assert.equal(getPropertyStockAlert(stock([row()]), property()), null);
});

test('same house number in another project or owner cannot override sold status', () => {
  const data = stock([row('Naphat', 'เดอะแกรนด์ไทยสมบูรณ์ 3', '89/34'), row('เจ๊หมวย', 'พฤกษา วิลล์ 41/1', '89/34', true)]);
  assert.equal(propertyStockStatus(data, property('เจ๊หมวย', 'พฤกษาวิลล์ 41/1', '89/34')).type, 'sold');
  assert.equal(propertyStockStatus(data, property('Naphat', 'เดอะแกรนด์ไทยสมบูรณ์ 3', '89/34')).type, 'available');
  assert.equal(propertyStockStatus(stock([row('Startup Up', '', '89/294')]), property('Naphat', 'พฤกษาวิลล์ 41/1', '89/294')).type, 'mismatch');
});

test('missing or stale source coverage does not become a missing-house warning', () => {
  for (const data of [{ houses: {}, coversPartners: true }, { ...stock([]), coveredOwners: ['Startup Up'] }, { ...stock([]), stale: true }]) {
    assert.equal(propertyStockStatus(data, property()).type, 'unavailable');
    assert.equal(getPropertyStockAlert(data, property()), null);
  }
  assert.equal(propertyStockStatus(stock([]), property()).type, 'missing');
  assert.equal(propertyStockStatus(stock([]), property('Notting', 'Project', '')).type, 'unavailable');
});

test('aliases require an unambiguous project and only one abbreviated number', () => {
  assert.equal(propertyStockStatus(stock([row()]), property('Notting', 'ทรัพย์ไพศาล', '122')).type, 'available');
  assert.equal(propertyStockStatus(stock([row(), row('Notting', 'บ้านทรัพย์ไพศาล', '108/122')]), property('Notting', 'ทรัพย์ไพศาล', '122')).type, 'ambiguous');
  assert.equal(propertyStockStatus(stock([row()]), property('Notting', 'ทรัพย์ไพศาล', '108/122')).type, 'missing');
  assert.equal(propertyStockStatus(stock([row('Notting', 'พฤกษา 12', '1/2')]), property('Notting', 'พฤกษา 1', '1/2')).type, 'mismatch');
  assert.equal(propertyStockStatus(stock([row(), row('Notting', 'บ้านทรัพย์ไพศาล', '107/122', true)]), property()).type, 'ambiguous');
});

test('all five source readers preserve duplicate numbers and report coverage per owner', async () => {
  const original = globalThis.fetch;
  let failedOwner = '';
  globalThis.fetch = async url => {
    const source = MASTER_STOCK_SOURCES.find(s => s.gid === new URL(url).searchParams.get('gid'));
    if (source.owner === failedOwner) return new Response('', { status: 503 });
    return new Response(`Title\nหมู่บ้าน,บ้านเลขที่,สถานะ,ราคา\n${source.owner},1/2,ว่าง,100\n`);
  };
  try {
    assert.equal(MASTER_STOCK_SOURCES.find(s => s.owner === 'Notting').gid, '1781736015');
    const complete = await fetchMasterStockIndex();
    assert.equal(complete.rows.length, 5);
    assert.equal(complete.pending.length, 5);
    assert.equal(complete.houseCount, 5);
    assert.ok(complete.coveredOwners.includes('Notting'));
    failedOwner = 'Notting';
    const partial = await fetchMasterStockIndex();
    assert.ok(!partial.coveredOwners.includes('Notting'));
    assert.ok(partial.coveredOwners.includes('Startup Up'));
    assert.equal(propertyStockStatus(partial, property()).type, 'unavailable');
    failedOwner = 'Startup Up';
    const noCompany = await fetchMasterStockIndex();
    assert.ok(!noCompany.coveredOwners.includes('Startup Up'));
    assert.ok(noCompany.coveredOwners.includes('Notting'));
  } finally { globalThis.fetch = original; }
});
