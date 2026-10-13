import test from 'node:test';
import assert from 'node:assert/strict';
import { statusOptions, matchesStatus, toggleStatus, isStatusGroup } from '../lib/statusFilters.mjs';

const houses = [
  { rawStatus: 'ว่าง', group: 'ready' },
  { rawStatus: 'ว่าง', group: 'ready' },
  { rawStatus: 'ยื่นกู้', group: 'hold' },
  { rawStatus: 'รอโอน', group: 'hold' },
  { rawStatus: 'ยังไม่เสร็จ', group: 'wip' },
];
const options = statusOptions([{ projects: [{ houses }] }]);
test('options retain all statuses and counts independently of selection', () => {
  assert.deepEqual(options.map(o => [o.key, o.count]), [['ยังไม่เสร็จ', 1], ['ว่าง', 2], ['ยื่นกู้', 1], ['รอโอน', 1]]);
});
test('multiple statuses form a union; all and empty are distinct', () => {
  assert.equal(houses.filter(h => matchesStatus(h, ['ว่าง', 'รอโอน'])).length, 3);
  assert.equal(houses.filter(h => matchesStatus(h, null)).length, 5);
  assert.equal(houses.filter(h => matchesStatus(h, [])).length, 0);
});
test('checkbox toggles support selecting from empty and removing from all', () => {
  assert.deepEqual(toggleStatus([], 'ว่าง', options), ['ว่าง']);
  const selected = toggleStatus(null, 'ว่าง', options);
  assert.equal(selected.includes('ว่าง'), false);
  assert.equal(selected.length, 3);
  assert.equal(toggleStatus(selected, 'ว่าง', options), null);
});
test('group presets require exactly their statuses', () => {
  assert.equal(isStatusGroup(['ยื่นกู้', 'รอโอน'], 'hold', options), true);
  assert.equal(isStatusGroup(['ยื่นกู้'], 'hold', options), false);
  assert.equal(isStatusGroup(null, 'hold', options), false);
});
test('new and blank source statuses remain selectable', () => {
  const extra = [{ rawStatus: ' สถานะใหม่ ', group: 'hold' }, { rawStatus: '', group: 'wip' }];
  const derived = statusOptions([{ projects: [{ houses: extra }] }]);
  assert.equal(derived.length, 2);
  assert.equal(matchesStatus(extra[0], ['สถานะใหม่']), true);
  assert.equal(matchesStatus(extra[1], ['ไม่ระบุสถานะ']), true);
});
