import { createHash } from 'node:crypto';

export function alertTransition(failed, previous) {
  if (failed) return previous?.failed && previous?.alertSucceeded ? null : 'down';
  return previous?.failed ? 'recovered' : null;
}

export async function sendSaleAlert({ state, token, userId, runId, runUrl, fetcher = fetch }) {
  if (!token || !/^U[0-9a-f]{32}$/.test(userId || '')) throw new Error('LINE alert secrets are missing or invalid');
  if (!['down', 'recovered'].includes(state)) throw new Error('Invalid alert state');
  // Stable per run/event, so re-running a failed delivery does not duplicate accepted messages.
  const digest = createHash('sha256').update(`sale-health:${runId}:${state}`).digest('hex');
  const retryKey = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const timestamp = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  const text = state === 'down'
    ? `แจ้งเตือน Peth: ระบบข้อมูล Sale Page มีปัญหา\nตรวจบ้านตัวอย่างแล้วโหลดไม่สำเร็จหรือข้อมูลตอบกลับไม่ถูกต้อง กรุณาตรวจสอบ\nเวลาไทย ${timestamp}\nผลตรวจ: ${runUrl}`
    : `แจ้งเตือน Peth: ระบบข้อมูล Sale Page กลับมาตอบปกติ\nบ้านตัวอย่างผ่านการตรวจแล้ว\nเวลาไทย ${timestamp}\nผลตรวจ: ${runUrl}`;
  const response = await fetcher('https://api.line.me/v2/bot/message/push', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Line-Retry-Key': retryKey },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  });
  if (!response.ok && !(response.status === 409 && response.headers.get('x-line-accepted-request-id'))) {
    // Do not log the response body, token, recipient ID or Authorization header.
    throw new Error(`LINE alert delivery failed (HTTP ${response.status})`);
  }
}
