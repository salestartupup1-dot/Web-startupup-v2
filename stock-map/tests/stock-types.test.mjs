import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchStockRows, selectOwnedActive } from '../lib/stock.js';

test('current house type column drives active inventory; sold and consignment stay excluded', async t => {
  const csv = [
    'ประเภทบ้าน,สถานะ,บ้านเลขที่,หมู่บ้าน,หุ้นส่วน',
    'ทาวน์เฮาส์,ว่าง,1/1,Example,',
    'ทาวน์เฮาส์แปลงมุม,รอโอน,1/2,Example,',
    'บ้านแฝดแปลงมุม,ยังไม่เสร็จ,1/3,Example,',
    'บ้านเดี่ยว,ว่าง,1/4,Example,',
    'คอนโด,ยื่นกู้,1/5,Example,',
    ',ขายแล้ว,1/6,Example,',
    'บ้านเดี่ยว,ว่าง,1/7,Example,3%',
    ',ว่าง,1/8,Example,',
  ].join('\n');
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => csv }));
  const active = selectOwnedActive(await fetchStockRows());
  assert.equal(active.length, 6);
  assert.deepEqual(active.map(h => h.styleCategory), ['townhouse', 'corner', 'twin', 'detached', 'condo', 'other']);
  assert.equal(active[0].style, 'ทาวน์เฮาส์');
  assert.equal(active.at(-1).houseNumber, '1/8');
});

test('current column takes precedence and legacy format still works when missing or blank', async t => {
  let csv = 'หมู่บ้าน,รูปแบบ,ประเภทบ้าน\nA,บ้านเดี่ยว,ห้องชุด\nB,บ้านแฝด,\n';
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => csv }));
  assert.deepEqual((await fetchStockRows()).map(h => h.styleCategory), ['condo', 'twin']);
  csv = 'หมู่บ้าน,รูปแบบ\nA,ทาวน์เฮาส์หลังริม\n';
  assert.equal((await fetchStockRows())[0].styleCategory, 'corner');
});
