import test from 'node:test';
import assert from 'node:assert/strict';
import { alertTransition, sendSaleAlert } from '../lib/saleMonitorAlert.mjs';
test('alerts on outage and recovery without repeating a continuing outage', () => {
  assert.equal(alertTransition(false, null), null);
  assert.equal(alertTransition(true, null), 'down');
  assert.equal(alertTransition(true, { failed: true, alertSucceeded: true }), null);
  assert.equal(alertTransition(true, { failed: true, alertSucceeded: false }), 'down');
  assert.equal(alertTransition(false, { failed: true }), 'recovered');
});
test('LINE delivery is restricted to the configured personal user and stable retry key', async () => {
  const calls = [], userId = 'U' + 'a'.repeat(32);
  const opts = { state: 'down', token: 'test-secret', userId, runId: '123',
    runUrl: 'https://github.com/owner/repo/actions/runs/123', fetcher: async (url, options) => {
      calls.push({ url, options }); return new Response(null, { status: 200 });
    } };
  await sendSaleAlert(opts); await sendSaleAlert(opts);
  assert.equal(calls[0].url, 'https://api.line.me/v2/bot/message/push');
  assert.equal(JSON.parse(calls[0].options.body).to, userId);
  assert.equal(calls[0].options.headers['X-Line-Retry-Key'], calls[1].options.headers['X-Line-Retry-Key']);
  await assert.rejects(sendSaleAlert({ ...opts, userId: 'Peth', fetcher: () => assert.fail('no name-based send') }));
});
test('delivery failure is visible without leaking token or response body', async () => {
  await assert.rejects(sendSaleAlert({ state: 'down', token: 'secret', userId: 'U' + 'a'.repeat(32),
    runId: '1', runUrl: 'https://github.com', fetcher: async () => Response.json({ secret: 'private' }, { status: 401 }) }),
    error => error.message === 'LINE alert delivery failed (HTTP 401)');
});

test('manual test verifies the recipient and labels the message as a test', async () => {
  const userId = 'U' + 'b'.repeat(32), calls = [];
  await sendSaleAlert({ state: 'test', token: 'test-secret', userId, runId: '2', runUrl: 'https://github.com',
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return url.includes('/profile/') ? Response.json({ userId }) : new Response(null, { status: 200 });
    } });
  assert.equal(calls.length, 2);
  assert.match(JSON.parse(calls[1].options.body).messages[0].text, /ข้อความทดสอบ/);
});

test('an unverified LINE recipient cannot receive the test', async () => {
  let calls = 0;
  await assert.rejects(sendSaleAlert({ state: 'test', token: 'test-secret', userId: 'U' + 'b'.repeat(32),
    runId: '3', runUrl: 'https://github.com', fetcher: async () => { calls++; return new Response(null, { status: 404 }); } }), /recipient verification failed/);
  assert.equal(calls, 1);
});
