import { FieldPath } from 'firebase-admin/firestore';
import { cleanText, sanitizeTouch } from './lineAttribution.js';
import { leadDb, httpError } from './lineServer.js';
import { platformDateKey, reportPlatform, reportRange } from './lineReport.js';

export const PHONE_CLICKS_COLLECTION = 'startupup_phone_clicks_private';
const validId = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);

export function phoneClickRecord(body, now = Date.now()) {
  if (!validId(body?.eventId) || typeof body.phone !== 'string' || !/^\+?\d{8,15}$/.test(body.phone)) {
    throw httpError(400, 'ข้อมูลการกดโทรไม่ถูกต้อง');
  }
  const first = sanitizeTouch(body.attribution?.first, now);
  const last = sanitizeTouch(body.attribution?.last, now);
  // Keep actual acquisition evidence; direct website visitors have no known source.
  const touch = last ? { ...last, entryPoint: '' } : null;
  const platform = reportPlatform(touch);
  return { kind: 'phone_click', phone: body.phone, occurredAt: now, platform,
    platformDateKey: platformDateKey(platform, now), touch, firstTouch: first,
    property: { id: cleanText(body.property?.id, 100), name: cleanText(body.property?.name), slug: cleanText(body.property?.slug, 240) },
    pagePath: cleanText(body.pagePath, 240).split(/[?#]/)[0].replace(/^([^/])/, '/$1'),
  };
}

export async function recordPhoneClick(body, db = leadDb(), now = Date.now()) {
  const record = phoneClickRecord(body, now);
  try { await db.collection(PHONE_CLICKS_COLLECTION).doc(body.eventId.toLowerCase()).create(record); }
  catch (error) { if (error.code !== 6 && error.code !== 'already-exists') throw error; }
}

export async function listPhoneClicks(input = {}, db = leadDb()) {
  const range = reportRange(input);
  const scope = `${range.start}/${range.end}/${range.platform}`;
  const field = range.platform === 'all' ? 'occurredAt' : 'platformDateKey';
  const key = at => range.platform === 'all' ? at : platformDateKey(range.platform, at);
  const base = db.collection(PHONE_CLICKS_COLLECTION).where(field, '>=', key(range.from)).where(field, '<', key(range.until));
  let query = base.orderBy(field, 'desc').orderBy(FieldPath.documentId(), 'desc');
  if (input.cursor) {
    let cursor;
    try { cursor = JSON.parse(Buffer.from(String(input.cursor), 'base64url').toString()); } catch { throw httpError(400, 'หน้าข้อมูลไม่ถูกต้อง'); }
    if (!cursor || cursor.scope !== scope || !validId(cursor.id) || !Number.isFinite(cursor.at) || cursor.at < range.from || cursor.at >= range.until) throw httpError(400, 'หน้าข้อมูลไม่ถูกต้อง');
    query = query.startAfter(key(cursor.at), cursor.id);
  }
  const [page, total] = await Promise.all([query.limit(51).get(), base.count().get()]);
  const docs = page.docs.slice(0, 50), last = docs.at(-1);
  return { clicks: docs.map(doc => ({ ...doc.data(), eventId: doc.id })), total: total.data().count,
    nextCursor: page.docs.length > 50 ? Buffer.from(JSON.stringify({ scope, at: last.data().occurredAt, id: last.id })).toString('base64url') : null };
}
