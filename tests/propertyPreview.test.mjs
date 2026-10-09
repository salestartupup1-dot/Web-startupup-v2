import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyPreview } from '../lib/propertyPreview.js';

test('preview preserves photos and identity but cannot expose stale commercial fields', () => {
  const source = { id: 'id', custom_id: '1-2', project_name: 'House', images: ['image.jpg'],
    price: 100, badge: 'Sold Out', status: 'sold', highlights: 'Old discount', promotion: true,
    futurePriceField: 200 };
  const preview = createPropertyPreview(source);
  assert.deepEqual(preview, { id: 'id', custom_id: '1-2', project_name: 'House',
    images: ['image.jpg'], _detailsPending: true });
  assert.equal(source.price, 100);
  assert.equal(source._detailsPending, undefined);
});
