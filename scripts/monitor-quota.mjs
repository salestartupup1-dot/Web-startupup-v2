import { createSign, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { readDailyUsage } from '../lib/firestoreQuota.mjs';

// This job is opt-in: a dedicated credential belongs in Actions secrets, never
// NEXT_PUBLIC variables. Metrics are delayed; this is not a hard quota cap.
const PROJECT = 'startup-up-realestate';
async function main() {
  let token = process.env.FIREBASE_MONITOR_ACCESS_TOKEN;
  if (!token) {
  const account = JSON.parse(process.env.FIREBASE_MONITOR_SERVICE_ACCOUNT || '{}');
  if (account.project_id !== PROJECT || !account.client_email || !account.private_key) throw new Error('Configure FIREBASE_MONITOR_SERVICE_ACCOUNT for startup-up-realestate');
  const issued = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/monitoring.read https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: issued, exp: issued + 3600 })}`;
  const signed = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');
  const auth = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signed}` }),
    signal: AbortSignal.timeout(15000) });
  if (!auth.ok) throw new Error(`Monitoring authentication HTTP ${auth.status}`);
  ({ access_token: token } = await auth.json());
  }
  const usage = await readDailyUsage({ token, projectId: PROJECT });
  await mkdir('coverage', { recursive: true });
  await writeFile('coverage/firestore-quota.json', JSON.stringify(usage, null, 2));
  console.log(JSON.stringify(usage));
  if (usage.stale) console.log('::warning::Usage metrics are more than 15 minutes old; remaining quota is uncertain.');
  // Restricts new expensive Lead Source summary scans once the observed count
  // reaches 45k. It never bypasses freshness checks on prices or availability.
  const fields = Object.fromEntries(Object.entries(usage).filter(([key]) => key !== 'stale').map(([key, value]) =>
    [key, typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]));
  const saved = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/website_read_snapshots_private/quota_budget`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }), signal: AbortSignal.timeout(10000),
  });
  if (!saved.ok) console.log(`::warning::Optional-read guard was not updated: Firestore HTTP ${saved.status}`);
  const isTest = process.env.QUOTA_TEST_LINE === 'true' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  if (!usage.threshold && !isTest) return;
  const lineToken = process.env.LINE_ALERT_CHANNEL_ACCESS_TOKEN, userId = process.env.LINE_ALERT_USER_ID;
  if (!lineToken || !/^U[0-9a-f]{32}$/.test(userId || '')) throw new Error('Quota threshold reached but LINE alert secrets are missing');
  const hash = createHash('sha256').update(isTest ? `${PROJECT}:test:${process.env.GITHUB_RUN_ID}` : `${PROJECT}:${usage.day}:${usage.threshold}`).digest('hex');
  // LINE keeps retry keys for 24h; quota-day + threshold prevents repeated alerts.
  const retryKey = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST', headers: { Authorization: `Bearer ${lineToken}`, 'Content-Type': 'application/json', 'X-Line-Retry-Key': retryKey },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text:
      `${isTest ? 'ข้อความทดสอบถึง Peth: เชื่อมระบบแจ้งเตือนโควตาแล้ว' : 'แจ้งเตือนโควตาเว็บไซต์ Startup Up'}\nอ่าน Firestore แล้วประมาณ ${usage.reads.toLocaleString('en-US')} / 50,000 ครั้ง\nรอบโควตา ${usage.day} (เวลา Pacific)\nข้อมูลถึง ${usage.observedThrough}\nสถิติมีความล่าช้า ยอดจริงอาจสูงกว่านี้${usage.threshold >= 45000 ? (saved.ok ? '\nบันทึกสถานะพักการคำนวณสรุป Lead Source ใหม่แล้ว' : '\nยังบันทึกสถานะพักรายงานไม่ได้ โปรดตรวจ Firebase') : ''}` }] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok && !(response.status === 409 && response.headers.get('x-line-accepted-request-id'))) throw new Error(`LINE quota notification HTTP ${response.status}`);
  console.log('Quota alert accepted or previously delivered.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
