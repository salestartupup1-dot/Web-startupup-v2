import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { recordPhoneClick, listPhoneClicks, phoneClickRecord, PHONE_CLICKS_COLLECTION } from '../lib/phoneClickServer.js';
import { createPhoneClickTracker, installPhoneClickTracking } from '../lib/phoneClicks.js';
import { sameOrigin } from '../lib/lineServer.js';
const at = Date.parse('2026-10-12T12:00:00+07:00');
const range = { start: '2026-10-12', end: '2026-10-12' };
const body = (source = 'facebook', time = at) => ({ eventId: randomUUID(), phone: '0624782426',
  property: { id: 'house-1', name: 'บ้านทดสอบ 50/125', slug: 'house-1' },
  attribution: { last: { source, at: time, campaign: 'test-campaign' } }, pagePath: '/api/share?secret=drop#drop' });

test('phone records are anonymous clicks with server time, sanitized source and no caller data', () => {
  const data = phoneClickRecord({ ...body(), occurredAt: 1, userId: 'fake-person', callerPhone: 'private', callerName: 'private' }, at);
  assert.equal(data.occurredAt, at);
  assert.equal(data.kind, 'phone_click');
  assert.equal(data.pagePath, '/api/share');
  assert.equal(data.platform, 'facebook');
  assert.equal(data.callerPhone, undefined); assert.equal(data.userId, undefined);
  assert.equal(phoneClickRecord(body('facebook_ads'), at).platform, 'facebook');
  assert.equal(phoneClickRecord(body('google_ads'), at).platform, 'website');
  assert.equal(phoneClickRecord(body('unknown'), at).platform, 'unknown');
  assert.equal(phoneClickRecord(body('facebook', at - 31 * 86400000), at).platform, 'unknown');
  for (const invalid of [null, {}, { ...body(), eventId: '../bad' }, { ...body(), phone: 'javascript:alert(1)' }]) assert.throws(() => phoneClickRecord(invalid, at), { status: 400 });
});

test('repeat delivery counts once; real later clicks remain events; tied pagination and Thai date boundaries', async () => {
  const db = memoryDb(), one = body();
  await recordPhoneClick(one, db, at); await recordPhoneClick(one, db, at + 1);
  assert.equal(db.data.size, 1);
  for (let i = 0; i < 51; i++) await recordPhoneClick(body(), db, at);
  await recordPhoneClick(body('tiktok'), db, at + 1);
  const start = Date.parse('2026-10-12T00:00:00+07:00');
  await recordPhoneClick(body('google_ads', start), db, start);
  await recordPhoneClick(body('google_ads', start + 86400000 - 1), db, start + 86400000 - 1);
  await recordPhoneClick(body('tiktok', start - 1), db, start - 1);
  await recordPhoneClick(body('tiktok', start + 86400000), db, start + 86400000);
  const first = await listPhoneClicks(range, db);
  assert.equal(first.total, 55); assert.equal(first.clicks.length, 50);
  const second = await listPhoneClicks({ ...range, cursor: first.nextCursor }, db);
  assert.equal(second.clicks.length, 5); assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.clicks, ...second.clicks].map(row => row.eventId)).size, 55);
  const fb = await listPhoneClicks({ ...range, platform: 'facebook' }, db);
  assert.equal(fb.total, 52);
  assert.equal((await listPhoneClicks({ ...range, platform: 'facebook', cursor: fb.nextCursor }, db)).clicks.length, 2);
  assert.equal((await listPhoneClicks({ ...range, platform: 'website' }, db)).total, 2);
  await assert.rejects(listPhoneClicks({ ...range, platform: 'tiktok', cursor: first.nextCursor }, db), { status: 400 });
  await assert.rejects(listPhoneClicks({ ...range, cursor: 'bnVsbA' }, db), { status: 400 });
  assert.equal([...db.data.keys()].every(key => key.startsWith(PHONE_CLICKS_COLLECTION + '/')), true);
});

test('mobile clicks retry without randomUUID or mouse button; server acknowledgement clears the queue', async () => {
  const sent = [], fetched = [];
  const storage = new Map();
  const runtime = { crypto: { getRandomValues: bytes => { bytes.set(Array.from({ length: 16 }, (_, i) => i)); return bytes; } },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    location: { pathname: '/api/share' }, navigator: { sendBeacon: (url, blob) => { sent.push([url, blob]); return true; } },
    fetch: async (...args) => { fetched.push(args); throw new Error('phone app interrupted the request'); } };
  const anchor = { href: 'tel:0624782426', dataset: { phonePropertyId: 'h1', phonePropertyName: 'บ้านทดสอบ', phonePropertySlug: 'slug' }, getAttribute: () => 'tel:0624782426', hasAttribute: () => false };
  const event = { defaultPrevented: false, target: { closest: () => anchor }, preventDefault() { throw new Error('must not block dialing'); } };
  const tracker = createPhoneClickTracker(runtime);
  tracker(event); tracker(event);
  assert.equal(sent.length, 1, 'beacon is queued before the click handler returns');
  assert.equal(fetched.length, 1, 'fetch starts before the click handler returns');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 2); assert.equal(fetched.length, 1);
  assert.equal(sent[0][0], '/api/contact/phone-click');
  assert.equal(JSON.parse(await sent[0][1].text()).property.name, 'บ้านทดสอบ');
  assert.equal(fetched[0][1].keepalive, true);
  assert.equal(JSON.parse([...storage.values()][0]).length, 1, 'beacon acceptance does not clear pending delivery');
  const id = JSON.parse(fetched[0][1].body).eventId;
  assert.match(id, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
  runtime.fetch = async (...args) => { fetched.push(args); return { ok: true, status: 204 }; };
  const resumed = createPhoneClickTracker(runtime);
  resumed.flush();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(JSON.parse(fetched[1][1].body).eventId, id);
  assert.equal(JSON.parse([...storage.values()][0]).length, 0);
  tracker({ ...event, button: 2 });
  assert.equal(sent.length, 2);
  resumed({ ...event, defaultPrevented: true, button: -1 });
  assert.equal(sent.length, 3, 'a touch activation handled by other analytics is still counted');
  await new Promise(resolve => setImmediate(resolve));
});

test('tracking runs in capture phase and retries on mobile resume; cleanup removes every listener', () => {
  const handlers = new Map(), removed = [];
  const target = prefix => ({ addEventListener: (name, fn, capture) => handlers.set(prefix + name, { fn, capture }), removeEventListener: (name, fn, capture) => { assert.deepEqual(handlers.get(prefix + name), { fn, capture }); removed.push(prefix + name); } });
  const doc = { ...target('doc:'), visibilityState: 'hidden' };
  const runtime = { ...target('window:'), navigator: {}, sessionStorage: { getItem: () => '[]', setItem: () => {} } };
  const stop = installPhoneClickTracking(runtime, doc);
  assert.equal(handlers.get('doc:click').capture, true);
  for (const name of ['doc:visibilitychange', 'window:pageshow', 'window:online', 'window:focus']) assert.equal(typeof handlers.get(name).fn, 'function');
  assert.doesNotThrow(() => handlers.get('doc:visibilitychange').fn());
  stop(); assert.equal(removed.length, 5);
});

test('collection writes require the website origin and JSON body', () => {
  assert.throws(() => sameOrigin({ headers: { origin: 'https://evil.example', 'content-type': 'application/json' } }), { status: 403 });
  assert.throws(() => sameOrigin({ headers: { origin: 'https://www.startupup-real-estate.com', 'content-type': 'text/plain' } }), { status: 415 });
  assert.doesNotThrow(() => sameOrigin({ headers: { origin: 'https://www.startupup-real-estate.com', 'content-type': 'application/json' } }));
});
function memoryDb() {
  const data = new Map();
  const ref = (collection, id) => ({ key: collection + '/' + id, id,
    async create(value) { if (data.has(this.key)) throw Object.assign(new Error('exists'), { code: 6 }); data.set(this.key, value); } });
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
        select: () => query(conditions, ordering, after, limit),
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
