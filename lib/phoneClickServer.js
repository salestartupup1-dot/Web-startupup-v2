import { FieldPath } from 'firebase-admin/firestore';
import { cleanText, sanitizeTouch } from './lineAttribution.js';
import { leadDb, httpError } from './lineServer.js';
import { platformDateKey, reportPlatform, reportRange } from './lineReport.js';

export const PHONE_CLICKS_COLLECTION = 'startupup_phone_clicks_private';
export const LINE_CLICKS_COLLECTION = 'startupup_line_clicks_private';
const validId = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);

export function phoneClickRecord(body, now = Date.now()) {
  const kind = body?.kind === undefined ? 'phone_click' : body.kind;
  if (!validId(body?.eventId) || !['phone_click', 'line_click'].includes(kind)
    || (kind === 'phone_click' && (typeof body.phone !== 'string' || !/^\+?\d{8,15}$/.test(body.phone)))) {
    throw httpError(400, 'ข้อมูลการกดติดต่อไม่ถูกต้อง');
  }
  const first = sanitizeTouch(body.attribution?.first, now);
  const last = sanitizeTouch(body.attribution?.last, now);
  // Keep actual acquisition evidence; direct website visitors have no known source.
  const touch = last ? { ...last, entryPoint: '' } : null;
  const platform = reportPlatform(touch);
  return { kind, phone: kind === 'phone_click' ? body.phone : '', occurredAt: now, platform,
    placement: ['footer', 'sale_page', 'other'].includes(body.placement) ? body.placement : 'unknown',
    platformDateKey: platformDateKey(platform, now), touch, firstTouch: first,
    property: { id: cleanText(body.property?.id, 100), name: cleanText(body.property?.name), slug: cleanText(body.property?.slug, 240) },
    pagePath: cleanText(body.pagePath, 240).split(/[?#]/)[0].replace(/^([^/])/, '/$1'),
  };
}

export async function recordPhoneClick(body, db = leadDb(), now = Date.now()) {
  const record = phoneClickRecord(body, now);
  const collection = record.kind === 'line_click' ? LINE_CLICKS_COLLECTION : PHONE_CLICKS_COLLECTION;
  try { await db.collection(collection).doc(body.eventId.toLowerCase()).create(record); }
  catch (error) { if (error.code !== 6 && error.code !== 'already-exists') throw error; }
}

export async function listPhoneClicks(input = {}, db = leadDb()) {
  const kind = input.kind === undefined ? 'phone' : input.kind;
  if (!['phone', 'line'].includes(kind)) throw httpError(400, 'ประเภทการติดต่อไม่ถูกต้อง');
  const collection = kind === 'line' ? LINE_CLICKS_COLLECTION : PHONE_CLICKS_COLLECTION;
  const range = reportRange(input);
  const scope = `${range.start}/${range.end}/${range.platform}/${kind}`;
  const field = range.platform === 'all' ? 'occurredAt' : 'platformDateKey';
  const key = at => range.platform === 'all' ? at : platformDateKey(range.platform, at);
  const base = db.collection(collection).where(field, '>=', key(range.from)).where(field, '<', key(range.until));
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
