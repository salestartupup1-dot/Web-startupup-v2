import test from 'node:test';
import assert from 'node:assert/strict';
import { reportRange, reportPlatform, defaultReportRange, formatReportDate, parseReportDate } from '../lib/lineReport.js';
import { claimIntent, createIntent, recordLineEvent, listLeads, backfillVisitHistory, LEADS_COLLECTION, VISITS_COLLECTION } from '../lib/lineServer.js';
import { qrAttribution } from '../lib/lineLaunch.js';

const day = { start: '2026-09-23', end: '2026-09-23' };
const at = Date.parse('2026-09-23T12:00:00+07:00');
const profile = { userId: 'U' + 'a'.repeat(32), displayName: 'Repeat customer', pictureUrl: '' };
test('report inputs use day/month/year without locale ambiguity and preserve Thai date boundaries', () => {
  assert.equal(formatReportDate('2026-09-01'), '01/09/2026');
  assert.equal(parseReportDate('04/09/2026'), '2026-09-04');
  assert.equal(parseReportDate('29/02/2028'), '2028-02-29');
  const range = reportRange({ start: parseReportDate('23/09/2026'), end: parseReportDate('24/09/2026') });
  assert.equal(range.from, Date.parse('2026-09-22T17:00:00Z'));
  assert.equal(range.until, Date.parse('2026-09-24T17:00:00Z'));
  for (const value of ['', '9/4/2026', '2026-09-23', '09/23/2026', '31/04/2026', '29/02/2026', null]) {
    assert.throws(() => parseReportDate(value), /dd\/mm\/yyyy/);
  }
  assert.throws(() => reportRange({ start: parseReportDate('24/09/2026'), end: parseReportDate('23/09/2026') }), { status: 400 });
});
// Query-capable store: tests run the real reporting/claim functions without live customer writes.
function memoryDb() {
  const data = new Map();
  const ref = (collection, id) => ({ key: collection + '/' + id, id,
    async create(value) { assert.equal(data.has(this.key), false); data.set(this.key, value); } });
  const snap = r => ({ id: r.id, ref: r, exists: data.has(r.key), data: () => data.get(r.key) });
  function collection(name) {
    function query(conditions = [], ordering = [], after = null, limit = Infinity) {
      const value = (doc, field) => typeof field === 'string' ? doc.data()[field] : doc.id;
      const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
      function rows() {
        let docs = [...data.keys()].filter(key => key.startsWith(name + '/')).map(key => snap(ref(name, key.slice(name.length + 1))));
        docs = docs.filter(doc => conditions.every(([field, op, v]) => op === '>=' ? value(doc, field) >= v : value(doc, field) < v));
        docs.sort((a, b) => { for (const [field, direction] of ordering) { const c = compare(value(a, field), value(b, field)) * (direction === 'desc' ? -1 : 1); if (c) return c; } return 0; });
        if (after) docs = docs.filter(doc => { for (let i = 0; i < ordering.length; i++) { const [field, direction] = ordering[i]; const c = compare(value(doc, field), after[i]) * (direction === 'desc' ? -1 : 1); if (c) return c > 0; } return false; });
        return docs.slice(0, limit);
      }
      return { doc: id => ref(name, id), where: (...c) => query([...conditions, c], ordering, after, limit),
        orderBy: (field, direction = 'asc') => query(conditions, [...ordering, [field, direction]], after, limit),
        startAfter: (...cursor) => query(conditions, ordering, cursor, limit), limit: n => query(conditions, ordering, after, n),
        get: async () => { const docs = rows(); return { docs, size: docs.length }; },
        count: () => ({ get: async () => ({ data: () => ({ count: rows().length }) }) }) };
    }
    return query();
  }
  return { data, collection, getAll: async (...refs) => refs.map(snap), runTransaction: async fn => fn({
    get: async r => snap(r), set: (r, v, opts) => data.set(r.key, opts?.merge ? { ...data.get(r.key), ...v } : v),
    update: (r, v) => data.set(r.key, { ...data.get(r.key), ...v }),
  }) };
}
async function visit(db, channel, time, customer = profile) {
  const token = await createIntent({ attribution: qrAttribution(channel, time) }, db, time);
  await claimIntent(token, customer, db, time);
  return token;
}
test('Thai dates include both endpoint days, including UTC previous evening; invalid filters reject', () => {
  const range = reportRange(day);
  assert.equal(range.from, Date.parse('2026-09-22T17:00:00Z'));
  assert.equal(range.until, Date.parse('2026-09-23T17:00:00Z'));
  assert.deepEqual(defaultReportRange(Date.parse('2026-09-30T18:00:00Z')), { start: '2026-10-01', end: '2026-10-01' });
  for (const input of [{ start: '2026-02-30' }, { start: '2026-09-24', end: '2026-09-23' }, { start: ['2026-09-23'] }, { platform: 'nope' }]) {
    assert.throws(() => reportRange({ ...day, ...input }), { status: 400 });
  }
});
test('platform grouping keeps website clicks together and consolidates social ad subtypes', () => {
  assert.equal(reportPlatform({ source: 'facebook_ads' }), 'facebook');
  assert.equal(reportPlatform({ source: 'google_organic' }), 'website');
  assert.equal(reportPlatform({ source: 'tiktok_ads' }), 'tiktok');
  assert.equal(reportPlatform({ source: 'facebook', entryPoint: 'website' }), 'website');
  assert.equal(reportPlatform(null), 'unknown');
});
test('same customer in same/different channels creates separate immutable visits; retry stays one', async () => {
  const db = memoryDb();
  const first = await visit(db, 'tiktok', at);
  await claimIntent(first, profile, db, at + 1);
  await visit(db, 'tiktok', at + 1000);
  await visit(db, 'facebook', at + 2000);
  const report = await listLeads(day, db);
  assert.equal(report.total, 3);
  assert.deepEqual(report.leads.map(v => v.platform), ['facebook', 'tiktok', 'tiktok']);
  assert.equal(new Set(report.leads.map(v => v.userId)).size, 1);
  assert.equal(new Set(report.leads.map(v => v.eventId)).size, 3);
  assert.equal(report.counts.tiktok, 2); assert.equal(report.counts.facebook, 1);
  assert.equal((await listLeads({ ...day, platform: 'tiktok' }, db)).leads.length, 2);
});
test('date boundaries exclude adjacent days, exact counts exceed page size, tied timestamps paginate without gaps', async () => {
  const db = memoryDb(), { from, until } = reportRange(day);
  await visit(db, 'facebook', from - 1);
  for (let i = 0; i < 53; i++) await visit(db, 'tiktok', at);
  await visit(db, 'google', from); await visit(db, 'google', until - 1); await visit(db, 'facebook', until);
  const first = await listLeads(day, db);
  assert.equal(first.total, 55); assert.equal(first.counts.tiktok, 53); assert.equal(first.counts.facebook, 0);
  assert.equal(first.leads.length, 50);
  const second = await listLeads({ ...day, cursor: first.nextCursor }, db);
  assert.equal(second.leads.length, 5); assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.leads, ...second.leads].map(v => v.eventId)).size, 55);
  const filtered = await listLeads({ ...day, platform: 'tiktok' }, db);
  const filteredNext = await listLeads({ ...day, platform: 'tiktok', cursor: filtered.nextCursor }, db);
  assert.equal(filteredNext.leads.length, 3);
  await assert.rejects(listLeads({ ...day, platform: 'facebook', cursor: first.nextCursor }, db), { status: 400 });
  await assert.rejects(listLeads({ ...day, cursor: 'invalid' }, db), { status: 400 });
});
test('Google Search history merges with ads, preserving counts and pagination across tied timestamps', async () => {
  const db = memoryDb();
  for (let i = 0; i < 106; i++) {
    const platform = i % 2 ? 'google_organic' : 'website';
    const occurredAt = at + Math.floor(i / 40);
    const id = 'visit_' + i.toString(16).padStart(64, '0');
    db.data.set(`${VISITS_COLLECTION}/${id}`, { userId: profile.userId, platform, occurredAt,
      platformDateKey: `${platform}:${String(occurredAt).padStart(13, '0')}`, touch: { source: platform === 'website' ? 'google_ads' : 'google_organic' } });
  }
  await visit(db, 'facebook', at);
  const all = await listLeads(day, db);
  assert.equal(all.total, 107);
  assert.equal(all.counts.website, 106);
  assert.equal(all.counts.google_organic, undefined);
  const rows = [];
  let cursor;
  do {
    const page = await listLeads({ ...day, platform: 'website', ...(cursor ? { cursor } : {}) }, db);
    assert.equal(page.counts.website, 106);
    assert.ok(page.leads.every(lead => lead.platform === 'website'));
    rows.push(...page.leads);
    cursor = page.nextCursor;
    assert.ok(rows.length <= 106);
  } while (cursor);
  assert.equal(rows.length, 106);
  assert.equal(new Set(rows.map(row => row.eventId)).size, 106);
  assert.equal(rows.filter(row => row.touch.source === 'google_organic').length, 53);
  assert.ok(rows.every((row, i) => !i || rows[i - 1].occurredAt >= row.occurredAt));
});

test('messages update contact status without manufacturing additional visits', async () => {
  const db = memoryDb();
  const event = { type: 'message', timestamp: at, source: { type: 'user', userId: profile.userId } };
  await recordLineEvent(event, db, at);
  await recordLineEvent(event, db, at);
  await recordLineEvent({ ...event, timestamp: at + 1000 }, db, at + 1000);
  let report = await listLeads(day, db);
  assert.equal(report.total, 1); assert.equal(report.counts.unknown, 1);
  await visit(db, 'tiktok', at + 2000);
  await recordLineEvent({ ...event, type: 'follow', timestamp: at + 3000 }, db, at + 3000);
  report = await listLeads(day, db);
  assert.equal(report.total, 2); assert.equal(report.counts.tiktok, 1);
});
test('legacy migration runs once, preserves available history, and never overwrites a new visit', async () => {
  const db = memoryDb();
  db.data.set(`${LEADS_COLLECTION}/${profile.userId}`, { ...profile, firstSeenAt: at - 1000, attributedAt: at,
    updatedAt: at + 1000, lastTouch: { source: 'facebook', campaign: 'original', at }, connectionCount: 9 });
  // A live visit wins the race with the one-time rollout migration.
  await visit(db, 'tiktok', at + 2000);
  assert.equal((await backfillVisitHistory(db)).migrated, 0);
  assert.equal((await backfillVisitHistory(db)).migrated, 0);
  let report = await listLeads(day, db);
  assert.equal(report.total, 2);
  const legacy = report.leads.find(v => v.kind === 'legacy');
  assert.equal(legacy.touch.campaign, 'original'); assert.equal(legacy.occurredAt, at);
  assert.equal(report.leads.filter(v => v.kind === 'connection').length, 1);
  const other = 'U' + 'b'.repeat(32);
  db.data.set(`${LEADS_COLLECTION}/${other}`, { userId: other, firstSeenAt: at, updatedAt: at + 5000 });
  assert.equal((await backfillVisitHistory(db)).migrated, 1);
  assert.equal((await backfillVisitHistory(db)).migrated, 0);
  report = await listLeads(day, db); assert.equal(report.total, 3);
  assert.equal([...db.data.keys()].filter(key => key.startsWith(VISITS_COLLECTION + '/')).length, 3);
});
