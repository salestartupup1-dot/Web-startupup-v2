import assert from 'node:assert/strict';
import test from 'node:test';
import { acquisitionPlatform, listAcquisitions, listCustomerVisits } from '../lib/lineAcquisitionReport.js';
import { contactAttribution, detectTouch } from '../lib/lineAttribution.js';

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

test('paid acquisition accepts click IDs and paid campaign links, preserves website evidence, and ignores later returns', async () => {
  const date = '2026-11-09T21:16:00+07:00';
  const now = Date.parse(date);
  const web = touch => contactAttribution({ first: touch, last: touch }, '/line/go?via=website', now).last;
  const touch = (query, referrer = '') => detectTouch('/?' + query, referrer, now);
  const google = web(touch('gclid=sample'));
  const tiktok = web(touch('ttclid=sample'));
  const facebook = web(touch('utm_source=facebook&utm_medium=paid_social&utm_campaign=house_sale'));
  const qr = touch('utm_source=facebook&utm_medium=qr&utm_campaign=facebook_qr');
  const salePage = web(touch('', 'https://www.facebook.com/'));
  const db = fakeDb([
    doc(1, user(1), date, google), doc(2, user(2), date, tiktok), doc(3, user(3), date, facebook),
    doc(4, user(4), date, qr), doc(5, user(5), date, salePage),
    doc(6, user(4), '2026-11-10T10:00:00+07:00', facebook),
    doc(7, user(6), date, touch('fbclid=sample')),
    doc(8, user(7), date, touch('utm_source=facebook&utm_medium=paid_social')),
  ]);
  const input = { ...november, mode: 'paid-acquisition' };
  const report = await listAcquisitions(input, db);
  assert.equal(report.mode, 'paid-acquisition');
  assert.deepEqual(report.customerCounts, { google_ads: 1, tiktok_ads: 1, facebook_ads: 1, unknown: 4 });
  assert.equal(report.customerTotal, 7);
  assert.deepEqual((await listAcquisitions({ ...input, platform: 'facebook_ads' }, db)).leads.map(row => row.userId), [user(3)]);
  assert.equal((await listCustomerVisits(user(4), db)).visits.length, 2);
});

test('first channel uses the website entry or tagged source even without a campaign name', async () => {
  const date = '2026-11-20T17:39:00+07:00';
  const db = fakeDb([
    doc(1, user(1), date, { source: 'facebook', entryPoint: 'website', evidence: 'referrer' }),
    doc(2, user(2), date, { source: 'facebook', medium: 'qr' }),
    doc(3, user(3), date, { source: 'google_ads', medium: 'cpc', evidence: 'utm', entryPoint: 'website' }),
    doc(4, user(2), '2026-11-21T10:00:00+07:00', { source: 'website' }),
  ]);
  const report = await listAcquisitions({ ...november, mode: 'first-channel' }, db);
  assert.equal(report.customerCounts.website, 1);
  assert.equal(report.customerCounts.facebook, 1);
  assert.equal(report.customerCounts.google_ads, 1);
  assert.equal(report.customerTotal, 3);
  assert.equal((await listAcquisitions({ ...november, mode: 'first-channel', platform: 'website' }, db)).leads[0].userId, user(1));
});
