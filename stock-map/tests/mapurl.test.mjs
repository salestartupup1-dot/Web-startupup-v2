import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCoords } from '../lib/mapurl.mjs';

test('search links with query=lat,lng are read', () => {
  assert.deepEqual(
    extractCoords('https://www.google.com/maps/search/?api=1&query=13.83132202,100.7561064'),
    [13.831322, 100.756106],
  );
});

// หน้าของลิงก์ที่แชร์จากมือถือมี center= เป็นจุดตั้งต้นตาม IP ของคนเปิด (บ้านคนละที่ได้ค่าเดียวกัน)
test('the preview map centre is never treated as the house location', () => {
  const html = '<meta content="https://maps.google.com/maps/api/staticmap?center=14.041088%2C100.6731264&amp;zoom=16">';
  assert.equal(extractCoords(html), null);
});
