import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPartnerRows, fetchStockRows, selectAllActive, normalizeZoneName } from '../lib/stock.js';

const sheets = {
  1209885880: [ // Naphat — แถวแรกเป็นชื่อชีต, ราคาเป็นหน่วยล้าน, สถานะงานอยู่อีกคอลัมน์
    ' STOCK NAPHAT by Freelance,,,,,,,,,,',
    'สถานะ,สถานะ2,เขต,Location,หมู่บ้าน,บ้านเลขที่,Type, ขนาด,ราคา,นอน,น้ำ',
    'เร่งขาย,เสร็จแล้ว,ลำลูกกา,คลอง 2,แอร์วิลล่า ,5/755,ทาวน์เฮาส์,16,1.59,2,2',
    'ว่าง,กำลังปรับปรุง,สายไหม,สายไหม,มนชญา 1,121/196,ทาวน์เฮาส์,16,1.99,2,2',
    'จอง,กำลังปรับปรุง,ธัญบุรี,คลอง 2,พฤกษา,9/9,,,2.1,,',
    'ว่าง,เสร็จแล้ว,ลำลูกกา,คลอง 4,ซ้ำกับ Master,1/1,,,1.5,,',
    'ว่าง,เสร็จแล้ว,ลำลูกกา,คลอง 4,ไดมอนด์วิลล์ (ย้ายออก พ.ย.69),3/3,,,1.5,,,https://maps.app.goo.gl/z',
  ],
  597410899: [ // เจ๊หมวย
    ',พื้นที่,หมู่บ้าน,บ้านเลขที่,ขนาด,ราคาลด (ราคาตามพี่เกม), ราคาขาย ,สถานะ,Location',
    '1,คลอง2 ลำลูกกา,ฟ้าคลองหลวง,277,18,"1,890,000",,บ้านมาใหม่, https://maps.app.goo.gl/x ',
    '2,คลองหลวง คลอง 1 ,พรทวีวัฒน์,99/1,18,"1,690,000",,ขายแล้ว,',
  ],
  429867417: ['STOCK ใบชา,,,', 'หมู่บ้าน,บ้านเลขที่,ทำเล,สถานะ', 'พิบูลย์ทรัพย์,61/16,หนองจอก,ว่าง'],
  1781736015: ['STOCK Notting,,,', 'หมู่บ้าน,บ้านเลขที่,ทำเล,สถานะ,Location', 'ทรัพย์ไพศาล,107/122,หนองจอก,ว่าง,https://maps.app.goo.gl/y'],
  0: ['หมู่บ้าน,บ้านเลขที่,สถานะ,หุ้นส่วน', 'ซ้ำกับ Master,1/1,ว่าง,G+Naphat', 'ฝาก,2/2,ว่าง,3%'],
};

const mockSheets = (t, broken = []) => t.mock.method(globalThis, 'fetch', async (url) => {
  const gid = new URL(url).searchParams.get('gid');
  if (broken.includes(gid)) return { ok: false, status: 500 };
  return { ok: true, text: async () => sheets[gid].join('\n') };
});

test('partner sheets map into the same house shape with owner, status group, price and zone', async t => {
  mockSheets(t);
  const { rows, errors } = await fetchPartnerRows();
  assert.deepEqual(errors, []);
  const byNumber = Object.fromEntries(rows.map(h => [h.houseNumber, h]));

  assert.equal(byNumber['5/755'].owner, 'naphat');
  assert.equal(byNumber['5/755'].project, 'แอร์วิลล่า');
  assert.equal(byNumber['5/755'].zone, 'ลำลูกกา คลอง 2');
  assert.equal(byNumber['5/755'].price, 1590000);
  assert.equal(byNumber['5/755'].areaWah, 16);
  assert.deepEqual([byNumber['5/755'].rawStatus, byNumber['5/755'].group], ['เร่งขาย', 'ready']);
  assert.deepEqual([byNumber['121/196'].rawStatus, byNumber['121/196'].group], ['กำลังปรับปรุง', 'wip']);
  assert.equal(byNumber['121/196'].zone, 'สายไหม');
  assert.deepEqual([byNumber['9/9'].rawStatus, byNumber['9/9'].group], ['ติดจอง', 'hold']);
  assert.equal(byNumber['3/3'].project, 'ไดมอนด์วิลล์');
  assert.equal(byNumber['3/3'].note, 'ย้ายออก พ.ย.69');
  assert.equal(byNumber['3/3'].mapUrl, 'https://maps.app.goo.gl/z');
  assert.equal(byNumber['5/755'].mapUrl, '');

  assert.equal(byNumber['277'].owner, 'muay');
  assert.equal(byNumber['277'].zone, 'ลำลูกกา คลอง 2');
  assert.equal(byNumber['277'].price, 1890000);
  assert.equal(byNumber['277'].mapUrl, 'https://maps.app.goo.gl/x');
  assert.equal(byNumber['277'].group, 'ready');
  assert.equal(byNumber['99/1'].group, 'sold');

  assert.equal(byNumber['61/16'].owner, 'baicha');
  assert.equal(byNumber['107/122'].owner, 'notting');
  assert.equal(new Set(rows.map(h => h.uid)).size, rows.length);
});

test('active list keeps Master Stock rows, adds consignment, drops sold and partner duplicates', async t => {
  mockSheets(t);
  const all = selectAllActive(await fetchStockRows(), (await fetchPartnerRows()).rows);
  const dup = all.filter(h => h.houseNumber === '1/1');
  assert.equal(dup.length, 1);
  assert.equal(dup[0].owner, 'startup');
  assert.equal(all.find(h => h.houseNumber === '2/2').owner, 'consign');
  assert.equal(all.some(h => h.houseNumber === '99/1'), false);
});

test('one broken partner sheet is reported without hiding the others', async t => {
  mockSheets(t, ['597410899']);
  const { rows, errors } = await fetchPartnerRows();
  assert.equal(errors.length, 1);
  assert.match(errors[0], /เจ๊หมวย/);
  assert.equal(rows.some(h => h.owner === 'naphat'), true);
});

test('zone names from different sheets line up', () => {
  assert.equal(normalizeZoneName('คลอง2 ลำลูกกา'), 'ลำลูกกา คลอง 2');
  assert.equal(normalizeZoneName('ธัญบุรี คลอง4'), 'ธัญบุรี คลอง 4');
  assert.equal(normalizeZoneName(' คลองหลวง  คลอง 1 '), 'คลองหลวง คลอง 1');
  assert.equal(normalizeZoneName('หทัยราษฎร์ คลองสามวา'), 'หทัยราษฎร์ คลองสามวา');
});
