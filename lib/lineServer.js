import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldPath, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { cleanText, cleanBookingText, sanitizeTouch, chatUrl } from './lineAttribution.js';
import { PLATFORM_LABELS, platformDateKey, reportPlatform, reportRange } from './lineReport.js';

export const LEADS_COLLECTION = 'startupup_line_leads_private';
export const INTENTS_COLLECTION = 'startupup_line_intents_private';
export const RATE_COLLECTION = 'startupup_line_limits_private';
export const VISITS_COLLECTION = 'startupup_line_visits_private';
const OWNER_EMAIL = 'startup.up.real.estate@gmail.com';
const INTENT_TTL = 30 * 60 * 1000;
export function httpError(status, message) { return Object.assign(new Error(message), { status }); }

export function getLineConfig() {
  const missing = ['LINE_LIFF_ID', 'LINE_LOGIN_CHANNEL_ID', 'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY', 'LINE_TRACKING_SECRET']
    .filter(key => !process.env[key]?.trim());
  if (process.env.LINE_TRACKING_SECRET && process.env.LINE_TRACKING_SECRET.length < 32) missing.push('LINE_TRACKING_SECRET (32+ characters)');
  if (process.env.LINE_PRIVATE_RULES_CONFIRMED !== 'true') missing.push('LINE_PRIVATE_RULES_CONFIRMED');
  return { enabled: process.env.LINE_ATTRIBUTION_ENABLED === 'true', ready: missing.length === 0,
    missing, liffId: process.env.LINE_LIFF_ID || '',
    webhookReady: Boolean(process.env.LINE_CHANNEL_SECRET), mainAccount: '@SURE141' };
}

export function requireTracking() {
  const cfg = getLineConfig();
  if (!cfg.enabled || !cfg.ready) throw httpError(503, 'ระบบบันทึกต้นทางยังไม่พร้อมใช้งาน กรุณาติดต่อผ่าน LINE โดยตรง');
  return cfg;
}

export function adminApp() {
  const found = getApps().find(app => app.name === 'line-attribution');
  if (found) return found;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw httpError(503, 'ยังไม่ได้เชื่อมฐานข้อมูลสำหรับระบบลูกค้า LINE');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, 'line-attribution');
}
export function leadDb() { return getFirestore(adminApp()); }

export function allowedAdmin(claims, allowlist = process.env.LINE_LEADS_ADMIN_EMAILS || OWNER_EMAIL) {
  const emails = allowlist.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  return claims?.email_verified === true && claims?.firebase?.sign_in_provider === 'google.com'
    && emails.includes(String(claims.email || '').toLowerCase());
}
export async function requireAdmin(req) {
  const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw httpError(401, 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล');
  let claims;
  try { claims = await getAuth(adminApp()).verifyIdToken(token, true); }
  catch (error) { if (error.status === 503) throw error; throw httpError(401, 'การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'); }
  if (!allowedAdmin(claims)) throw httpError(403, 'บัญชีนี้ยังไม่มีสิทธิ์ดูข้อมูลลูกค้า LINE');
  return claims;
}

export function sameOrigin(req) {
  const origin = req.headers.origin;
  const expected = process.env.LINE_SITE_ORIGIN || 'https://www.startupup-real-estate.com';
  const local = process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin || '');
  if (origin !== expected && !local) throw httpError(403, 'ไม่อนุญาตคำขอจากเว็บไซต์นี้');
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw httpError(415, 'รูปแบบคำขอไม่ถูกต้อง');
}

export async function rateLimit(req, scope, db = leadDb(), now = Date.now()) {
  // Vercel overwrites x-vercel-forwarded-for. Never store raw visitor IPs.
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  const hash = createHmac('sha256', process.env.LINE_TRACKING_SECRET).update(`${scope}:${ip}:${Math.floor(now / 600000)}`).digest('hex');
  const ref = db.collection(RATE_COLLECTION).doc(hash);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const count = snap.data()?.count || 0;
    if (count >= 40) throw httpError(429, 'มีคำขอจำนวนมาก กรุณารอสักครู่แล้วลองอีกครั้ง');
    tx.set(ref, { count: count + 1, expiresAt: Timestamp.fromMillis(now + 1200000) });
  });
}

export async function createIntent(body, db = leadDb(), now = Date.now()) {
  const first = sanitizeTouch(body?.attribution?.first, now);
  const last = sanitizeTouch(body?.attribution?.last, now);
  const token = randomBytes(24).toString('base64url');
  await db.collection(INTENTS_COLLECTION).doc(token).create({ first, last,
    property: { id: cleanText(body?.property?.id, 100), name: cleanText(body?.property?.name) },
    bookingText: cleanBookingText(body?.bookingText), createdAt: now,
    expiresAt: Timestamp.fromMillis(now + INTENT_TTL), claimedBy: null });
  return token;
}

export async function verifyLineToken(idToken, fetcher = fetch) {
  if (typeof idToken !== 'string' || idToken.length > 12000 || idToken.length < 20) throw httpError(401, 'กรุณายืนยันบัญชี LINE อีกครั้ง');
  const response = await fetcher('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: process.env.LINE_LOGIN_CHANNEL_ID }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw httpError(401, 'ไม่สามารถยืนยันบัญชี LINE ได้ กรุณาลองใหม่');
  const profile = await response.json();
  if (!/^U[0-9a-f]{32}$/.test(profile.sub || '')
      || String(profile.aud) !== process.env.LINE_LOGIN_CHANNEL_ID
      || profile.iss !== 'https://access.line.me' || profile.exp * 1000 <= Date.now()) {
    throw httpError(401, 'ข้อมูลยืนยัน LINE ไม่ถูกต้อง');
  }
  return { userId: profile.sub, displayName: cleanText(profile.name) || 'ลูกค้า LINE',
    pictureUrl: /^https:\/\/([a-z0-9-]+\.)*line-scdn\.net\//i.test(profile.picture || '') ? profile.picture : '' };
}

export async function claimIntent(token, profile, db = leadDb(), now = Date.now()) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token)) throw httpError(400, 'ลิงก์ไม่ถูกต้อง กรุณากลับไปกด LINE จากเว็บไซต์อีกครั้ง');
  const intentRef = db.collection(INTENTS_COLLECTION).doc(token);
  const leadRef = db.collection(LEADS_COLLECTION).doc(profile.userId);
  return db.runTransaction(async tx => {
    const [intentSnap, leadSnap] = await Promise.all([tx.get(intentRef), tx.get(leadRef)]);
    if (!intentSnap.exists) throw httpError(410, 'ลิงก์หมดอายุ กรุณากลับไปกด LINE จากเว็บไซต์อีกครั้ง');
    const intent = intentSnap.data();
    if (intent.expiresAt.toMillis() < now) throw httpError(410, 'ลิงก์หมดอายุ กรุณากลับไปกด LINE จากเว็บไซต์อีกครั้ง');
    if (intent.claimedBy && intent.claimedBy !== profile.userId) throw httpError(409, 'ลิงก์นี้ถูกใช้แล้ว กรุณาเปิดลิงก์ใหม่จากเว็บไซต์');
    if (intent.claimedBy === profile.userId) return { chatUrl: chatUrl(intent.bookingText) };
    const old = leadSnap.data() || {};
    preserveLegacyVisit(tx, db, old);
    const visitId = 'visit_' + createHash('sha256').update(token).digest('hex');
    tx.set(db.collection(VISITS_COLLECTION).doc(visitId), visitRecord(profile, intent.last, intent.property, now, 'connection'));
    const first = old.firstTouch?.source && old.firstTouch.source !== 'unknown' ? old.firstTouch : intent.first;
    const known = intent.last?.source && intent.last.source !== 'unknown';
    const latest = known && (!old.lastTouch || intent.last.at >= old.lastTouch.at)
      ? intent.last : (old.lastTouch || intent.last);
    tx.set(leadRef, { ...profile, firstTouch: first || null, lastTouch: latest || null,
      lastProperty: intent.property, firstSeenAt: old.firstSeenAt || now, updatedAt: now,
      attributedAt: now, connectionCount: (old.connectionCount || 0) + 1, visitHistoryVersion: 1,
    }, { merge: true });
    tx.update(intentRef, { claimedBy: profile.userId });
    return { chatUrl: chatUrl(intent.bookingText) };
  });
}

export function validSignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== 'string') return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const actual = Buffer.from(signature, 'base64');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function recordLineEvent(event, db = leadDb(), now = Date.now()) {
  if (event.source?.type !== 'user' || !/^U[0-9a-f]{32}$/.test(event.source.userId || '')) return;
  const fields = { follow: 'lastFollowAt', unfollow: 'lastUnfollowAt', message: 'lastMessageAt' };
  const field = fields[event.type];
  const at = Number(event.timestamp);
  if (!field || !Number.isFinite(at) || at > now + 60000 || at <= 0) return;
  const ref = db.collection(LEADS_COLLECTION).doc(event.source.userId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const old = snap.data() || {};
    if ((old[field] || 0) >= at) return; // Safe for retries and out-of-order delivery.
    preserveLegacyVisit(tx, db, old);
    if (!snap.exists && event.type !== 'unfollow') {
      tx.set(db.collection(VISITS_COLLECTION).doc('contact_' + event.source.userId),
        visitRecord({ userId: event.source.userId }, null, null, at, 'contact'));
    }
    tx.set(ref, { userId: event.source.userId, [field]: at,
      firstSeenAt: old.firstSeenAt || at, updatedAt: Math.max(old.updatedAt || 0, at), visitHistoryVersion: 1,
      ...(!snap.exists ? { displayName: 'ยังไม่ได้เชื่อมต้นทาง', pictureUrl: '', firstTouch: null,
        lastTouch: null, connectionCount: 0 } : {}),
    }, { merge: true });
  });
}

export function visitRecord(profile, touch, property, occurredAt, kind) {
  const platform = reportPlatform(touch);
  return { userId: profile.userId, displayName: profile.displayName || 'ยังไม่ได้เชื่อมต้นทาง',
    pictureUrl: profile.pictureUrl || '', touch: touch || null, property: property || null,
    occurredAt, platform, platformDateKey: platformDateKey(platform, occurredAt), kind };
}
function preserveLegacyVisit(tx, db, old) {
  if (!old.userId || old.visitHistoryVersion === 1) return false;
  const at = old.attributedAt || old.firstSeenAt || old.updatedAt;
  if (!Number.isFinite(at) || at <= 0) return false;
  tx.set(db.collection(VISITS_COLLECTION).doc('legacy_' + old.userId),
    visitRecord(old, old.lastTouch, old.lastProperty, at, 'legacy'));
  return true;
}
// Used once during rollout; the per-lead marker also makes concurrent live claims safe.
export async function backfillVisitHistory(db = leadDb()) {
  let after = null, migrated = 0;
  for (;;) {
    let query = db.collection(LEADS_COLLECTION).orderBy(FieldPath.documentId()).limit(100);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    if (!page.size) break;
    for (const doc of page.docs) {
      const changed = await db.runTransaction(async tx => {
        const current = await tx.get(doc.ref);
        if (!current.exists || current.data().visitHistoryVersion === 1) return false;
        const added = preserveLegacyVisit(tx, db, current.data());
        tx.update(doc.ref, { visitHistoryVersion: 1 });
        return added;
      });
      if (changed) migrated++;
    }
    after = page.docs.at(-1).id;
  }
  return { migrated };
}
export function visitQuery(db, range, platform = range.platform) {
  const field = platform === 'all' ? 'occurredAt' : 'platformDateKey';
  const lower = platform === 'all' ? range.from : platformDateKey(platform, range.from);
  const upper = platform === 'all' ? range.until : platformDateKey(platform, range.until);
  return db.collection(VISITS_COLLECTION).where(field, '>=', lower).where(field, '<', upper).orderBy(field, 'desc');
}
export async function listLeads(input = {}, db = leadDb()) {
  const range = reportRange(input);
  // Read historical Google Search visits together with Website/Google Ads.
  // Each stream uses its existing single-field index and the same chronological cursor.
  const platforms = range.platform === 'website' ? ['website', 'google_organic'] : [range.platform];
  const scope = `${range.start}/${range.end}/${range.platform}`;
  let parsed;
  if (input.cursor) {
    try { parsed = JSON.parse(Buffer.from(String(input.cursor), 'base64url').toString()); } catch { throw httpError(400, 'หน้าข้อมูลไม่ถูกต้อง'); }
    if (parsed.scope !== scope || !Number.isFinite(parsed.at) || parsed.at < range.from || parsed.at >= range.until
      || !/^(visit_[a-f0-9]{64}|(?:legacy|contact)_U[a-f0-9]{32})$/.test(parsed.id || '')) throw httpError(400, 'หน้าข้อมูลไม่ถูกต้อง');
  }
  const queries = platforms.map(platform => {
    const query = visitQuery(db, range, platform).orderBy(FieldPath.documentId(), 'desc');
    return parsed ? query.startAfter(platform === 'all' ? parsed.at : platformDateKey(platform, parsed.at), parsed.id) : query;
  });
  // Counts cover the entire date range, independently of the 50-row page size.
  const [snapshots, counts] = await Promise.all([Promise.all(queries.map(query => query.limit(51).get())), Promise.all(
    [...Object.keys(PLATFORM_LABELS), 'google_organic'].map(async platform => [platform, (await visitQuery(db, range, platform).count().get()).data().count])
  )]);
  const sorted = snapshots.flatMap(snapshot => snapshot.docs).sort((a, b) =>
    b.data().occurredAt - a.data().occurredAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  const docs = sorted.slice(0, 50);
  const groupedCounts = Object.fromEntries(counts);
  groupedCounts.website += groupedCounts.google_organic;
  delete groupedCounts.google_organic;
  const ids = [...new Set(docs.map(doc => doc.data().userId))];
  const profiles = ids.length ? await db.getAll(...ids.map(id => db.collection(LEADS_COLLECTION).doc(id))) : [];
  const byUser = new Map(profiles.map(doc => [doc.id, doc.data() || {}]));
  const last = docs.at(-1);
  return { leads: docs.map(doc => {
    const event = doc.data(), customer = byUser.get(event.userId) || {};
    return { ...customer, ...event, displayName: customer.displayName || event.displayName,
      pictureUrl: customer.pictureUrl || event.pictureUrl, eventId: doc.id,
      platform: event.platform === 'google_organic' ? 'website' : event.platform };
  }),
    counts: groupedCounts, total: counts.reduce((sum, [, count]) => sum + count, 0),
    range: { start: range.start, end: range.end, platform: range.platform },
    nextCursor: sorted.length > 50
      ? Buffer.from(JSON.stringify({ at: last.data().occurredAt, id: last.id, scope })).toString('base64url') : null };
}

export function respondError(res, error) {
  const status = error.status || 500;
  // Never log tokens, profiles, request bodies or credential-bearing errors.
  if (!error.status) console.error('LINE integration request failed', error.code || 'internal');
  return res.status(status).json({ error: error.status ? error.message : 'ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง' });
}
