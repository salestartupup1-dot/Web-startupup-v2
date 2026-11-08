import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLlmsText, thaiMonthYear } from '../lib/llmsText.js';

test('llms.txt follows the work order and dates its live price range in the Thai calendar', () => {
  const text = buildLlmsText({ count: 36, min: 1690000, max: 4490000 }, new Date('2026-11-08T07:00:00Z'));
  assert.ok(text.startsWith('# Startup Up Real Estate\n\n> ขายบ้านมือสองรีโนเวทพร้อมเข้าอยู่'));
  assert.ok(text.includes('บ้านที่เปิดขายในปทุมธานีราคาตั้งแต่ 1,690,000 ถึง 4,490,000 บาท (ข้อมูล พ.ย. 2569 ดูราคาล่าสุดบนเว็บ)'));
  for (const line of ['โทร: 062-478-2426', 'LINE: https://www.startupup-real-estate.com/line/go?via=website',
    'สำนักงาน: 39/43, 39/44 หมู่ 5 ต.คลองสาม อ.คลองหลวง จ.ปทุมธานี 12120',
    '- บ้านมือสองรีโนเวท ปทุมธานี: https://www.startupup-real-estate.com/บ้านรีโนเวท-ปทุมธานี']) assert.ok(text.includes(line), line);
  assert.equal(thaiMonthYear(new Date('2026-12-31T18:00:00Z')), 'ม.ค. 2570', 'Bangkok time decides the month');
});

test('without live stock the file never invents a price range', () => {
  const text = buildLlmsText(null);
  assert.ok(text.includes('## ราคา\nดูราคาล่าสุดของแต่ละหลังบนเว็บ'));
  assert.doesNotMatch(text, /\d,\d{3},\d{3}/);
});
