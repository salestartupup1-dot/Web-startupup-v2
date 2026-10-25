import test from 'node:test';
import assert from 'node:assert/strict';
import { keepForeignParams, SITE_OWNED_PARAMS } from '../lib/urlParams.js';
import { selectListingProperties, readListingQuery, appendListingQuery } from '../lib/listingPagination.js';
import { monthlyMortgage } from '../lib/mortgage.js';

const house = (id, inventoryState, extra = {}) => ({ id, inventoryState, project_name: `บ้าน ${id}`, category: 'ทาวน์เฮาส์',
  province: 'ปทุมธานี', district: 'คลองหลวง', main_location: 'คลองหลวง', price: 2000000, ...extra });
const stock = [house('a', 'available'), house('r', 'renovating'), house('b', 'backup', { badge: 'Promotion' }),
  house('sold', 'sold', { badge: 'Sold Out' }), house('res', 'reserved', { badge: 'Promotion' }), house('u', 'unknown'),
  house('lam', 'available', { district: 'ลำลูกกา', main_location: 'ลำลูกกา' })];

test('ad click IDs and campaign tags survive every URL rewrite; site-owned keys do not leak', () => {
  const params = new URLSearchParams({ tab: 'all' });
  keepForeignParams(params, '?tab=location&gclid=abc&gbraid=g&wbraid=w&utm_source=google&utm_campaign=x&fbclid=f&near=ลำลูกกา&page=3&admin=1');
  assert.equal(params.get('tab'), 'all');
  for (const [key, value] of [['gclid', 'abc'], ['gbraid', 'g'], ['wbraid', 'w'], ['utm_source', 'google'], ['utm_campaign', 'x'], ['fbclid', 'f'], ['near', 'ลำลูกกา']]) {
    assert.equal(params.get(key), value, key);
  }
  for (const key of ['page', 'admin']) assert.equal(params.has(key), false, key);
  assert.ok(!SITE_OWNED_PARAMS.has('gclid'));
});

test('all, promo and category lists show only ว่าง / ยังไม่เสร็จ / ยื่นซ้อนได้; the sold portfolio keeps sold homes', () => {
  assert.deepEqual(selectListingProperties(stock, {}, {}).map(p => p.id).sort(), ['a', 'b', 'lam', 'r']);
  assert.deepEqual(selectListingProperties(stock, { type: 'promo' }, {}).map(p => p.id), ['b']);
  assert.deepEqual(selectListingProperties(stock, { type: 'category', value: 'ทาวน์เฮาส์' }, {}).map(p => p.id).sort(), ['a', 'b', 'lam', 'r']);
  assert.deepEqual(selectListingProperties(stock, { type: 'sold' }, {}).map(p => p.id), ['sold']);
});

test('?near= puts that area first without filtering or entering the canonical listing query', () => {
  const listing = readListingQuery(new URLSearchParams('near=ลำลูกกา'));
  assert.equal(listing.near, 'ลำลูกกา');
  const ordered = selectListingProperties(stock, {}, listing);
  assert.equal(ordered[0].id, 'lam');
  assert.equal(ordered.length, 4);
  assert.equal(appendListingQuery(new URLSearchParams(), listing).has('near'), false);
});

test('card estimate uses the full price at 3% over 40 years', () => {
  assert.equal(Math.round(monthlyMortgage(2090000, 3, 40)), 7482);
});
