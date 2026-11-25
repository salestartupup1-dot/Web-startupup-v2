import assert from 'node:assert/strict';
import test from 'node:test';
import { acquisitionPlatform, listAcquisitions, listCustomerVisits } from '../lib/lineAcquisitionReport.js';

const user = i => 'U' + i.toString(16).padStart(32, '0');
const doc = (i, userId, date, touch, kind = 'connection') => {
  const id = kind === 'connection' ? 'visit_' + i.toString(16).padStart(64, '0') : `${kind}_${userId}`;
  const row = { userId, kind, occurredAt: Date.parse(date), touch };
  return { id, ref: { id }, data: () => row };
};
const november = { start: '2026-11-01', end: '2026-11-30' };
const december = { start: '2026-12-01', end: '2026-12-31' };
function fakeDb(docs) {
  return {
    collection(name) {
      const where = (key, op, value) => {
        const result = docs.filter(item => op === '==' ? item.data()[key] === value : item.data()[key] < value);
        return { select: () => ({ get: async () => ({ docs: result }) }), get: async () => ({ docs: result }) };
      };
      return { where, doc: id => ({ id, profile: name.includes('leads') }) };
    },
    getAll: async (...refs) => refs.map(ref => ref.profile
      ? { id: ref.id, data: () => ({ displayName: 'LINE customer' }) }
      : docs.find(item => item.id === ref.id)),
  };
}

test('first connection precedes date/channel filters while history includes the later website return', async () => {
  const id = user(1);
  const db = fakeDb([
    doc(1, id, '2026-11-09T21:16:00+07:00', { source: 'facebook', campaign: 'facebook_qr' }),
    doc(2, id, '2026-12-01T00:00:00+07:00', { source: 'website' }),
    doc(3, id, '2026-11-08T11:30:00+07:00', null, 'contact'),
  ]);
  const first = await listAcquisitions({ ...november, platform: 'facebook' }, db);
  assert.equal(first.customerTotal, 1);
  assert.equal(first.leads[0].platform, 'facebook');
  assert.equal((await listAcquisitions({ ...november, platform: 'website' }, db)).leads.length, 0);
  assert.equal((await listAcquisitions(december, db)).customerTotal, 0);
  assert.deepEqual((await listCustomerVisits(id, db)).visits.map(visit => visit.touch?.source), ['website', 'facebook', undefined]);
});

test('acquisition separates Google Ads, organic search and unknown website acquisition', () => {
  assert.equal(acquisitionPlatform({ source: 'google_ads', evidence: 'google_click_id', entryPoint: 'website' }), 'google_ads');
  assert.equal(acquisitionPlatform({ source: 'google_organic', entryPoint: 'website' }), 'google_organic');
  assert.equal(acquisitionPlatform({ source: 'website', entryPoint: 'website' }), 'website');
  assert.equal(acquisitionPlatform(null), 'unknown');
});

test('pagination counts the entire cohort once and binds cursors to the selected channel', async () => {
  const db = fakeDb(Array.from({ length: 51 }, (_, i) => doc(i, user(i), '2026-11-10T12:00:00+07:00', { source: 'facebook' })));
  const first = await listAcquisitions({ ...november, platform: 'facebook' }, db);
  const second = await listAcquisitions({ ...november, platform: 'facebook', cursor: first.nextCursor }, db);
  assert.equal(first.leads.length, 50);
  assert.equal(second.leads.length, 1);
  assert.equal(second.customerCounts.facebook, 51);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.leads, ...second.leads].map(lead => lead.userId)).size, 51);
  await assert.rejects(listAcquisitions({ ...november, platform: 'website', cursor: first.nextCursor }, db), { status: 400 });
});
