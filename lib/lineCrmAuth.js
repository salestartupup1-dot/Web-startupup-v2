const CRM_PROJECT = 'startup-up-crm';
const ROLES = new Set(['owner', 'admin', 'senior_sales', 'sales', 'editor', 'viewer']);
const failure = (status, message) => Object.assign(new Error(message), { status });

// The decoded claims only locate the member document. Firestore validates the
// signature, expiration and project before the membership is trusted.
export async function requireCrmLeadSourceMember(authorization, fetcher = fetch) {
  const token = /^Bearer (\S+)$/.exec(authorization || '')?.[1];
  let claims;
  try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); }
  catch { throw failure(401, 'กรุณาเข้าสู่ระบบ CRM อีกครั้ง'); }
  if (claims.aud !== CRM_PROJECT || claims.iss !== `https://securetoken.google.com/${CRM_PROJECT}`
    || typeof claims.sub !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(claims.sub)) {
    throw failure(401, 'กรุณาเข้าสู่ระบบ CRM อีกครั้ง');
  }
  let response;
  try {
    response = await fetcher(`https://firestore.googleapis.com/v1/projects/${CRM_PROJECT}/databases/(default)/documents/users/${encodeURIComponent(claims.sub)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
  } catch { throw failure(503, 'ตรวจสิทธิ์ CRM ไม่สำเร็จ กรุณาลองใหม่'); }
  if (!response.ok) {
    if (response.status === 401) throw failure(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบ CRM อีกครั้ง');
    if ([403, 404].includes(response.status)) throw failure(403, 'บัญชีนี้ยังไม่มีสิทธิ์ดู Lead Source');
    throw failure(503, 'ตรวจสิทธิ์ CRM ไม่สำเร็จ กรุณาลองใหม่');
  }
  const member = await response.json();
  if (member.fields?.active?.booleanValue !== true || !ROLES.has(member.fields?.role?.stringValue)) {
    throw failure(403, 'บัญชีนี้ยังไม่ได้รับอนุมัติหรือถูกปิดใช้งาน');
  }
  return { uid: claims.sub, role: member.fields.role.stringValue };
}
