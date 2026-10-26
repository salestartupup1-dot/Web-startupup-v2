import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCoords } from '../lib/mapurl.mjs';

test('search links with query=lat,lng are read', () => {
  assert.deepEqual(
    extractCoords('https://www.google.com/maps/search/?api=1&query=13.83132202,100.7561064'),
    [13.831322, 100.756106],
  );
});

test('place pages shared from a phone fall back to the preview map centre', () => {
  const html = '<meta content="https://maps.google.com/maps/api/staticmap?center=14.041088%2C100.6731264&amp;zoom=16">';
  assert.deepEqual(extractCoords(html), [14.041088, 100.673126]);
});

test('the exact place pin still wins over the preview centre', () => {
  const text = 'center=14.1%2C100.1 data=!3d14.2!4d100.2';
  assert.deepEqual(extractCoords(text), [14.2, 100.2]);
});
