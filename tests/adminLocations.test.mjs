import test from 'node:test';
import assert from 'node:assert/strict';
import { adminLocationOptions, standardSubLocations } from '../lib/adminLocations.js';
import { THAI_LOCATIONS } from '../lib/data/thaiLocations.js';

test('covers every province and Bangkok district without municipal-only records', () => {
  assert.equal(Object.keys(THAI_LOCATIONS).length, 77);
  assert.equal(Object.values(THAI_LOCATIONS).reduce((sum, districts) => sum + Object.keys(districts).length, 0), 928);
  assert.equal(standardSubLocations('กรุงเทพมหานคร').length, 50);
  for (const province of Object.keys(THAI_LOCATIONS)) {
    const result = adminLocationOptions([], province);
    assert.deepEqual(new Set(result.subOptions), new Set(Object.keys(THAI_LOCATIONS[province])));
    assert.ok(result.subOptions.length);
  }
});

test('existing district-based areas include all subdistricts and keep canal names', () => {
  const result = adminLocationOptions([{ area: 'คลองหลวง', sub_areas: ['คลองหนึ่ง', 'คลองสี่'] }], 'คลองหลวง');
  assert.equal(result.subOptions.length, 7);
  assert.ok(result.subOptions.includes('คลองเจ็ด'));
  assert.ok(standardSubLocations('สามโคก').includes('เชียงรากใหญ่'));
  assert.ok(standardSubLocations('เมืองปทุมธานี').includes('บ้านกลาง'));
  assert.ok(standardSubLocations('ลำลูกกา').includes('บึงคำพร้อย'));
});

test('merges province aliases, custom locations and saved values without changing source', () => {
  const locations = [{ area: 'อยุธยา', sub_areas: ['พยอม'] }, { area: 'กรุงเทพมหานคร', sub_areas: ['ดอนเมือง', 'พหลโยธิน 48'] }];
  const before = structuredClone(locations);
  const ayutthaya = adminLocationOptions(locations, 'อยุธยา', 'ทำเลเดิม');
  assert.ok(ayutthaya.subOptions.includes('บางปะอิน'));
  assert.ok(ayutthaya.subOptions.includes('พยอม'));
  assert.ok(ayutthaya.subOptions.includes('ทำเลเดิม'));
  assert.ok(!ayutthaya.mainOptions.includes('พระนครศรีอยุธยา'));
  assert.equal(adminLocationOptions(locations, 'กรุงเทพมหานคร').subOptions.length, 51);
  assert.deepEqual(locations, before);
  const legacy = adminLocationOptions([], 'ทำเลเฉพาะเดิม', 'ซอยเดิม');
  assert.ok(legacy.mainOptions.includes('ทำเลเฉพาะเดิม'));
  assert.deepEqual(legacy.subOptions, ['ซอยเดิม']);
  assert.deepEqual(adminLocationOptions(null).subOptions, []);
  assert.equal(standardSubLocations('กรุงเทพฯ').length, 50);
  assert.equal(standardSubLocations('จังหวัดนนทบุรี').length, 6);
});
