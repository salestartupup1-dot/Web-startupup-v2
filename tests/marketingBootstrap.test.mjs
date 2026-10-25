import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installMarketingScripts, MARKETING_BOOTSTRAP } from '../lib/marketingBootstrap.js';
import { gtagSendEvent } from '../lib/googleAdsConversion.js';

function fixture({ complete = false, idleAPI = true } = {}) {
  const win = new EventTarget(), doc = new EventTarget();
  const scripts = [], idle = new Map(), timers = new Map(); let counter = 0;
  doc.readyState = complete ? 'complete' : 'loading'; doc.visibilityState = 'visible';
  doc.createElement = () => ({}); doc.getElementById = id => scripts.find(s => s.id === id);
  doc.head = { appendChild: s => scripts.push(s) };
  win.setTimeout = (fn, ms) => { const id = ++counter; timers.set(id, { fn, ms }); return id; };
  win.clearTimeout = id => timers.delete(id);
  if (idleAPI) {
    win.requestIdleCallback = (fn, options) => { assert.equal(options.timeout, 1000); const id = ++counter; idle.set(id, fn); return id; };
    win.cancelIdleCallback = id => idle.delete(id);
  }
  const nextIdle = () => { const [id, fn] = idle.entries().next().value; idle.delete(id); fn(); };
  return { win, doc, scripts, idle, timers, nextIdle };
}

test('queues exist before load; passive visits load both SDKs once during idle', () => {
  const f = fixture(); const api = installMarketingScripts(f.win, f.doc);
  f.win.gtag('event', 'view_property', { property_id: 'fixture' });
  assert.equal(f.scripts.length, 0);
  assert.equal(f.win.dataLayer[0].event, 'gtm.js');
  assert.equal(f.win.dataLayer[1][1], 'view_property');
  assert.deepEqual([...f.win.ttq], [['page']]);
  f.win.dispatchEvent(new Event('load')); f.nextIdle();
  assert.equal(f.scripts.length, 1); assert.match(f.scripts[0].src, /gtm.js/);
  f.nextIdle(); assert.equal(f.scripts.length, 2);
  assert.equal(installMarketingScripts(f.win, f.doc), api);
  api.start(); f.win.dispatchEvent(new Event('load'));
  assert.equal(f.scripts.length, 2); assert.equal(f.idle.size, 0);
  assert.equal(f.win.ttq._i.D929G0BC77U133LMGG50._u, 'https://analytics.tiktok.com/i18n/pixel/events.js');
});

test('early touch, keyboard, navigation and leaving bypass idle without duplicate page views', () => {
  for (const trigger of ['pointerdown', 'keydown', 'hidden', 'pagehide', 'navigation']) {
    const f = fixture({ complete: true }); const api = installMarketingScripts(f.win, f.doc);
    if (trigger === 'hidden') { f.doc.visibilityState = 'hidden'; f.doc.dispatchEvent(new Event('visibilitychange')); }
    else if (trigger === 'pagehide') f.win.dispatchEvent(new Event('pagehide'));
    else if (trigger === 'navigation') api.start();
    else f.doc.dispatchEvent(new Event(trigger));
    assert.equal(f.scripts.length, 2, trigger); assert.equal(f.idle.size, 0);
    api.start(); assert.equal(f.scripts.length, 2);
    assert.equal(f.win.ttq.filter(v => v[0] === 'page').length, 1);
  }
});

test('a contact during idle starts SDKs, keeps conversion queued and preserves navigation deadline', () => {
  const f = fixture(); installMarketingScripts(f.win, f.doc);
  const visits = []; f.win.location = { assign: url => visits.push(url) };
  gtagSendEvent('/line/go', f.win);
  assert.equal(f.scripts.length, 2);
  const event = f.win.dataLayer.find(v => v[1] === 'ads_conversion___1');
  assert.ok(event); assert.equal(event[2].event_timeout, 2000);
  const timeout = [...f.timers.values()].find(t => t.ms === 2000);
  timeout.fn(); event[2].event_callback();
  assert.deepEqual(visits, ['/line/go']);
});

test('fallback works without requestIdleCallback, and serialized document code is standalone', () => {
  const f = fixture({ complete: true, idleAPI: false });
  vm.runInNewContext(MARKETING_BOOTSTRAP, { window: f.win, document: f.doc });
  for (let i = 0; i < 2; i++) { const [id, task] = f.timers.entries().next().value; f.timers.delete(id); task.fn(); }
  assert.equal(f.scripts.length, 2);
});
