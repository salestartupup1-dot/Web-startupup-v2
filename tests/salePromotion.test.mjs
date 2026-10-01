import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSalePromotion, promotionExpiry, promotionAppliesTo, validateSalePromotion } from '../lib/salePromotion.js';

const active = { isActive: true, images: ['https://example.com/promo.jpg'], scope: 'selected', propertyIds: ['one'] };
test('promotions only appear on eligible houses, with nothing enabled by default', () => {
  assert.equal(promotionAppliesTo(null, { id: 'one' }), false);
  assert.equal(promotionAppliesTo(active, { id: 'one' }), true);
  assert.equal(promotionAppliesTo(active, { id: 'two' }), false);
  assert.equal(promotionAppliesTo({ ...active, scope: 'all' }, { id: 'two' }), true);
  for (const house of [{ id: 'one', badge: 'Sold Out' }, { id: 'one', status: 'sold' }, {}]) {
    assert.equal(promotionAppliesTo({ ...active, scope: 'all' }, house), false);
  }
  assert.equal(promotionAppliesTo({ ...active, isActive: false }, { id: 'one' }), false);
  assert.equal(promotionAppliesTo({ ...active, images: [] }, { id: 'one' }), false);
});

test('expiry includes the selected day in Bangkok and rejects impossible dates', () => {
  const data = { ...active, endDate: '2026-10-31' }, house = { id: 'one' };
  assert.equal(promotionAppliesTo(data, house, Date.parse('2026-10-31T16:59:59.999Z')), true);
  assert.equal(promotionAppliesTo(data, house, Date.parse('2026-10-31T17:00:00Z')), false);
  assert.ok(Number.isNaN(promotionExpiry('2026-02-29')));
  assert.ok(Number.isFinite(promotionExpiry('2028-02-29')));
  assert.equal(promotionAppliesTo({ ...active, endDate: 'invalid' }, house), false);
});

test('admin cannot activate a promotion without images, scope or a valid end date', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  assert.equal(validateSalePromotion(normalizeSalePromotion(active), now), '');
  assert.ok(validateSalePromotion({ ...active, images: [] }, now));
  assert.ok(validateSalePromotion({ ...active, propertyIds: [] }, now));
  assert.ok(validateSalePromotion({ ...active, endDate: '2026-09-30' }, now));
  assert.equal(validateSalePromotion({ ...active, isActive: false, images: [], endDate: '2026-09-30' }, now), '');
});

test('only secure images are accepted and the limit and deduplication apply', () => {
  const data = normalizeSalePromotion({ images: ['javascript:alert(1)', 'http://example.com/image.jpg', ...Array.from({ length: 8 }, (_, i) => `https://example.com/${i}.jpg`)], propertyIds: ['one', 'one', null], scope: 'unknown' });
  assert.equal(data.images.length, 5);
  assert.ok(data.images.every(url => url.startsWith('https://')));
  assert.deepEqual(data.propertyIds, ['one']);
  assert.equal(data.scope, 'selected');
});
