import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaDayStart, readDailyUsage, restrictOptionalReads } from '../lib/firestoreQuota.mjs';

test('quota window follows Pacific midnight including both DST transition days', () => {
  for (const [now, expected] of [
    ['2026-10-13T05:00:00Z', '2026-10-12T07:00:00.000Z'],
    ['2026-03-08T20:00:00Z', '2026-03-08T08:00:00.000Z'],
    ['2026-11-01T20:00:00Z', '2026-11-01T07:00:00.000Z'],
    ['2026-11-02T20:00:00Z', '2026-11-02T08:00:00.000Z'],
  ]) assert.equal(quotaDayStart(new Date(now)).toISOString(), expected);
});
test('counts every metric page and treats missing metrics as unknown', async () => {
  let calls = 0;
  const now = new Date('2026-10-13T12:00:00Z');
  const result = await readDailyUsage({ token: 'fake', projectId: 'test', now, fetcher: async url => {
    calls++;
    assert.equal(new URL(url).searchParams.get('interval.startTime'), '2026-10-13T07:00:00.000Z');
    return { ok: true, json: async () => ({ nextPageToken: calls === 1 ? 'next' : undefined,
      timeSeries: [{ points: [{ value: { int64Value: calls === 1 ? '30000' : '15000' }, interval: { endTime: '2026-10-13T11:57:00Z' } }] }] }) };
  } });
  assert.equal(calls, 2); assert.equal(result.reads, 45000); assert.equal(result.threshold, 45000); assert.equal(result.stale, false);
  await assert.rejects(readDailyUsage({ token: 'fake', projectId: 'test', now, fetcher: async () => ({ ok: true, json: async () => ({}) }) }), /No usage/);
});
test('optional reads resume in the next quota day, not at Thai midnight', () => {
  const budget = { day: '2026-10-12', reads: 45000 };
  assert.equal(restrictOptionalReads(budget, new Date('2026-10-13T06:59:59Z')), true);
  assert.equal(restrictOptionalReads(budget, new Date('2026-10-13T07:00:00Z')), false);
  assert.equal(restrictOptionalReads(null), false);
});
