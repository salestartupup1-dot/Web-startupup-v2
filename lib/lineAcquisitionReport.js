import { FieldPath } from 'firebase-admin/firestore';
import { LEADS_COLLECTION, VISITS_COLLECTION, httpError, leadDb } from './lineServer.js';
import { PLATFORM_LABELS, reportPlatform, reportRange } from './lineReport.js';

const CHANNELS = { ...PLATFORM_LABELS, google_ads: 'Google Ads', google_organic: 'Google Search' };
const validUser = value => /^U[0-9a-f]{32}$/.test(value || '');
const idOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function acquisitionPlatform(touch) {
  if (touch?.source === 'google_ads' || touch?.evidence === 'google_click_id') return 'google_ads';
  if (touch?.source === 'google_organic') return 'google_organic';
  if (touch?.source && touch.source !== 'unknown') return reportPlatform({ ...touch, entryPoint: '' });
  return reportPlatform(touch);
}

export function firstAcquisitions(documents) {
  const first = new Map();
  for (const doc of documents) {
    const { userId, kind, occurredAt, touch, acquisitionTouch } = doc.data();
    if (!validUser(userId) || !['connection', 'legacy'].includes(kind) || !Number.isFinite(occurredAt)) continue;
    const current = first.get(userId);
    if (current && (current.at < occurredAt || (current.at === occurredAt && idOrder(current.id, doc.id) <= 0))) continue;
    // A legacy snapshot preserves the last touch of the old report, so it cannot identify acquisition.
    first.set(userId, { userId, id: doc.id, ref: doc.ref, at: occurredAt, platform: kind === 'legacy' ? 'unknown' : acquisitionPlatform(acquisitionTouch || touch) });
  }
  return [...first.values()];
}

export async function listAcquisitions(input, db = leadDb()) {
  const range = reportRange({ ...input, platform: 'all' });
  const platform = input.platform ?? 'all';
  if (platform !== 'all' && !Object.hasOwn(CHANNELS, platform)) throw httpError(400, 'ช่องทางไม่ถูกต้อง');
  const scope = `${range.start}/${range.end}/${platform}/acquisition`;
  let cursor;
  if (input.cursor) {
    try { cursor = JSON.parse(Buffer.from(String(input.cursor), 'base64url').toString()); } catch { /* Invalid cursor below. */ }
    if (cursor?.scope !== scope || !Number.isFinite(cursor.at) || cursor.at < range.from || cursor.at >= range.until
      || !/^(visit_[a-f0-9]{64}|legacy_U[a-f0-9]{32})$/.test(cursor.id || '')) throw httpError(400, 'หน้าข้อมูลไม่ถูกต้อง');
  }

  // Project only classification fields. Earlier visits must participate before dates or channels are applied.
  const history = await db.collection(VISITS_COLLECTION).where('occurredAt', '<', range.until)
    .select('userId', 'occurredAt', 'kind', 'touch', 'acquisitionTouch').get();
  const acquisitions = firstAcquisitions(history.docs).filter(entry => entry.at >= range.from);
  const counts = Object.fromEntries(Object.keys(CHANNELS).map(channel => [channel, 0]));
  for (const entry of acquisitions) counts[entry.platform]++;
  const compare = (a, b) => b.at - a.at || idOrder(b.id, a.id);
  const page = acquisitions.filter(entry => (platform === 'all' || entry.platform === platform)
    && (!cursor || compare(entry, cursor) > 0)).sort(compare).slice(0, 51);
  const selected = page.slice(0, 50);
  const [visits, profiles] = selected.length ? await Promise.all([
    db.getAll(...selected.map(entry => entry.ref)),
    db.getAll(...selected.map(entry => db.collection(LEADS_COLLECTION).doc(entry.userId))),
  ]) : [[], []];
  const byUser = new Map(profiles.map(doc => [doc.id, doc.data() || {}]));
  const byVisit = new Map(visits.map(doc => [doc.id, doc.data() || {}]));
  const last = selected.at(-1);
  return {
    mode: 'acquisition', customerCounts: counts, customerTotal: acquisitions.length,
    counts, total: acquisitions.length,
    leads: selected.map(entry => {
      const event = byVisit.get(entry.id), profile = byUser.get(entry.userId) || {};
      return { ...profile, ...event, displayName: profile.displayName || event.displayName,
        pictureUrl: profile.pictureUrl || event.pictureUrl, userId: entry.userId, eventId: entry.id,
        occurredAt: entry.at, platform: entry.platform, touch: event.kind === 'legacy' ? null : event.acquisitionTouch || event.touch };
    }),
    nextCursor: page.length > 50 ? Buffer.from(JSON.stringify({ scope, at: last.at, id: last.id })).toString('base64url') : null,
  };
}

export async function listCustomerVisits(userId, db = leadDb()) {
  if (!validUser(userId)) throw httpError(400, 'รหัสลูกค้า LINE ไม่ถูกต้อง');
  const snapshot = await db.collection(VISITS_COLLECTION).where('userId', '==', userId).get();
  const visits = snapshot.docs.map(doc => ({ ...doc.data(), eventId: doc.id }))
    .sort((a, b) => b.occurredAt - a.occurredAt || idOrder(b.eventId, a.eventId));
  return { visits: visits.slice(0, 20), truncated: visits.length > 20 };
}
