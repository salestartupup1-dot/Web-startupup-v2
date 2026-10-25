import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp, httpError } from './lineServer.js';

const HOST_EMAIL = 'startup.up.real.estate@gmail.com';
const USERS_PATH = 'artifacts/startup-up-realestate/public/data/users';

// Same roles the back office grants in the browser (lib/siteSession.js), enforced
// server-side from a verified Google ID token. Anonymous visitors never pass.
export async function requireSiteAdmin(req, { auth = () => getAuth(adminApp()), db = () => getFirestore(adminApp()) } = {}) {
  const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw httpError(401, 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล');
  let claims;
  try { claims = await auth().verifyIdToken(token, true); }
  catch (error) { if (error.status === 503) throw error; throw httpError(401, 'การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'); }

  const email = String(claims.email || '').toLowerCase();
  if (claims.email_verified !== true || claims.firebase?.sign_in_provider !== 'google.com' || !email || email.includes('/')) {
    throw httpError(403, 'บัญชีนี้ไม่มีสิทธิ์ใช้งานหลังบ้าน');
  }
  if (email === HOST_EMAIL) return { email, role: 'host' };

  const snap = await db().doc(`${USERS_PATH}/${email}`).get();
  const role = snap.exists ? snap.get('role') : null;
  if (role !== 'admin' && role !== 'host') throw httpError(403, 'บัญชีนี้ไม่มีสิทธิ์ใช้งานหลังบ้าน');
  return { email, role };
}
