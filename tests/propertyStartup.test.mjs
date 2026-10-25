import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { PROPERTY_STARTUP_SCRIPT, startPropertyRequest, takeStartupPropertyResponse } from '../lib/propertyStartup.js';
import { fetchPublicPropertyApi } from '../lib/publicProperty.js';

function browser(path = '/?property=24-182') {
  const calls = [], timers = new Map(), events = {};
  const win = {
    location: { href: `https://example.com${path}` },
    setTimeout: fn => { const key = timers.size + 1; timers.set(key, fn); return key; },
    clearTimeout: key => timers.delete(key),
    addEventListener: (name, fn) => { events[name] = fn; },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ property: { id: 'house', price: 100 } });
    },
  };
  return { win, calls, timers, events };
}

test('inline startup works without the application bundle, only on direct house links', async () => {
  const { win, calls } = browser('/v4?property=%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99%201%2F2');
  runInNewContext(PROPERTY_STARTUP_SCRIPT, { window: win, URL, AbortController, Date });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/property?property=' + encodeURIComponent('บ้าน 1/2'));
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal((await (await takeStartupPropertyResponse('บ้าน 1/2', { win })).json()).property.price, 100);
  for (const path of ['/', '/?tab=all', '/admin/line-leads?property=x', '/?property=', '/?property=' + 'x'.repeat(501)]) {
    const idle = browser(path);
    startPropertyRequest(idle.win);
    assert.equal(idle.calls.length, 0, path);
  }
});

test('the normal API reader reuses the first request once, then reads fresh on revisit', async t => {
  const { win } = browser();
  let reads = 0;
  const fetcher = async () => { reads++; return Response.json({ property: { id: 'house', price: reads * 100 } }); };
  win.fetch = fetcher;
  globalThis.window = win;
  t.after(() => { delete globalThis.window; });
  t.mock.method(globalThis, 'fetch', fetcher);
  startPropertyRequest(win);
  assert.equal((await fetchPublicPropertyApi('24-182')).price, 100);
  assert.equal(reads, 1);
  assert.equal((await fetchPublicPropertyApi('24-182')).price, 200);
  assert.equal(reads, 2);
});

test('navigation mismatch, expiry and page exit discard startup data', () => {
  for (const scenario of ['mismatch', 'expired', 'pagehide', 'timer']) {
    const { win, calls, events, timers } = browser();
    startPropertyRequest(win);
    if (scenario === 'expired') win.__startupupPropertyRequest.startedAt -= 12001;
    if (scenario === 'pagehide') events.pagehide();
    if (scenario === 'timer') timers.values().next().value();
    const response = takeStartupPropertyResponse(scenario === 'mismatch' ? 'other-house' : '24-182', { win });
    assert.equal(response, undefined);
    assert.equal(calls[0].options.signal.aborted, true);
    assert.equal(win.__startupupPropertyRequest, undefined);
  }
});

test('startup failures enter the existing retry flow and never substitute an old price', async t => {
  const { win } = browser();
  let reads = 0;
  const fetcher = async () => ++reads === 1
    ? Response.json({ retryable: true }, { status: 503 })
    : Response.json({ property: { id: 'house', price: 200 } });
  win.fetch = fetcher;
  globalThis.window = win;
  t.after(() => { delete globalThis.window; });
  t.mock.method(globalThis, 'fetch', fetcher);
  startPropertyRequest(win);
  assert.equal((await fetchPublicPropertyApi('24-182', { sleep: async () => {} })).price, 200);
  assert.equal(reads, 2);
});

test('leaving during startup consumption aborts the outstanding request', async () => {
  const { win } = browser();
  win.fetch = () => new Promise(() => {});
  startPropertyRequest(win);
  const controller = new AbortController();
  const requestSignal = win.__startupupPropertyRequest.controller.signal;
  const response = takeStartupPropertyResponse('24-182', { win, signal: controller.signal });
  controller.abort();
  await assert.rejects(response, { name: 'AbortError' });
  assert.equal(requestSignal.aborted, true);
});
