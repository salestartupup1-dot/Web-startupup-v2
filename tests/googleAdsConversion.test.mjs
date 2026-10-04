import test from 'node:test';
import assert from 'node:assert/strict';
import { gtagSendEvent, trackContactClick } from '../lib/googleAdsConversion.js';

function runtime() {
  const calls = [], navigations = [], timers = new Map();
  return { calls, navigations, timers, gtag: (...args) => calls.push(args),
    location: { href: 'https://www.startupup-real-estate.com/', origin: 'https://www.startupup-real-estate.com', assign: url => navigations.push(url) },
    setTimeout: (fn, ms) => { assert.equal(ms, 2000); timers.set(1, fn); return 1; },
    clearTimeout: id => timers.delete(id) };
}
test('sends the supplied event, then navigates only once when Google calls back', () => {
  const w = runtime();
  assert.equal(gtagSendEvent('/line/go?via=website', w), false);
  assert.deepEqual(w.calls[0].slice(0, 2), ['event', 'ads_conversion___1']);
  assert.equal(w.calls[0][2].event_timeout, 2000);
  assert.deepEqual(w.navigations, []);
  const deadline = w.timers.get(1);
  w.calls[0][2].event_callback(); deadline(); w.calls[0][2].event_callback();
  assert.deepEqual(w.navigations, ['/line/go?via=website']);
  assert.equal(w.timers.size, 0);
});

test('only contact clicks send conversions; new tabs preserve native navigation', () => {
  const click = (href, target = '', extra = {}) => ({ button: 0, defaultPrevented: false,
    target: { closest: () => ({ href, target, hasAttribute: () => false }) },
    preventDefault() { this.defaultPrevented = true; }, ...extra });
  for (const href of ['tel:021234567', 'https://www.startupup-real-estate.com/line/go?property=5-557&via=website']) {
    const w = runtime(), event = click(href);
    trackContactClick(event, w);
    assert.equal(event.defaultPrevented, true);
    assert.equal(w.calls.length, 1);
    w.calls[0][2].event_callback();
    assert.deepEqual(w.navigations, [href]);
  }
  for (const extra of [{}, { ctrlKey: true }]) {
    const w = runtime(), event = click('/line/go', '_blank', extra);
    trackContactClick(event, w);
    assert.equal(event.defaultPrevented, false);
    assert.equal(w.calls.length, 1);
    assert.equal(w.timers.size, 0);
  }
  for (const event of [click('/'), click('https://example.com/line/go'), click('#'), click('/line/go', '', { defaultPrevented: true })]) {
    const w = runtime(); trackContactClick(event, w); assert.equal(w.calls.length, 0);
  }
});
test('blocked/unloaded tags cannot leave navigation stuck, and keep the event queued', () => {
  const w = runtime(); delete w.gtag;
  gtagSendEvent('/line/go', w);
  assert.equal(w.dataLayer[0][1], 'ads_conversion___1');
  w.timers.get(1)();
  assert.deepEqual(w.navigations, ['/line/go']);
});
test('a broken tag fails open and new-tab clicks can send without replacing the current page', () => {
  const w = runtime(); w.gtag = () => { throw new Error('blocked'); };
  gtagSendEvent('/line/go', w);
  assert.deepEqual(w.navigations, ['/line/go']);
  const tab = runtime(); gtagSendEvent(undefined, tab);
  assert.equal(tab.calls.length, 1);
  tab.calls[0][2].event_callback();
  assert.deepEqual(tab.navigations, []);
  assert.equal(tab.timers.size, 0);
});
