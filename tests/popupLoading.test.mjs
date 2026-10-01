import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribePopup } from '../lib/popupSubscription.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const win = new EventTarget(), page = new EventTarget();
  page.visibilityState = 'visible';
  const pending = [], values = [], timeouts = [];
  let emit, stopped = false;
  win.setTimeout = fn => { timeouts.push(fn); return timeouts.length; };
  win.clearTimeout = () => {};
  win.setInterval = () => 1;
  win.clearInterval = () => {};
  const stop = subscribePopup({ win, page,
    load: options => {
      assert.equal(options.cache, 'no-store');
      return new Promise((resolve, reject) => pending.push({ resolve, reject, options }));
    },
    observe: (options, next) => { emit = next; return () => { stopped = true; }; },
    onData: data => values.push(data),
  });
  return { win, pending, values, timeouts, stop, get stopped() { return stopped; },
    emit: (value, metadata = {}) => emit({ metadata, exists: () => Boolean(value), data: () => value }),
  };
}

test('initial popup starts immediately, without waiting for auth or a snapshot', async () => {
  const h = harness();
  assert.equal(h.pending.length, 1);
  h.pending[0].resolve({ imageUrl: 'new.jpg' }); await tick();
  assert.deepEqual(h.values, [{ imageUrl: 'new.jpg' }]); h.stop();
});

test('an old REST result cannot replace a newer confirmed popup or deletion', async () => {
  const h = harness();
  h.emit({ imageUrl: 'cached.jpg' }, { fromCache: true });
  h.emit({ imageUrl: 'unsaved.jpg' }, { hasPendingWrites: true });
  assert.equal(h.values.length, 0);
  h.emit({ imageUrl: 'latest.jpg' });
  h.pending[0].resolve({ imageUrl: 'old.jpg' }); await tick();
  assert.deepEqual(h.values, [{ imageUrl: 'latest.jpg' }]);
  h.emit(null); assert.equal(h.values.at(-1), null); h.stop();
});

test('focus refresh cancels the earlier request; an old timeout cannot abort the new one', async () => {
  const h = harness();
  h.win.dispatchEvent(new Event('focus'));
  assert.equal(h.pending[0].options.signal.aborted, true);
  h.timeouts[0]();
  assert.equal(h.pending[1].options.signal.aborted, false);
  h.pending[1].resolve({ imageUrl: 'latest.jpg' }); await tick();
  h.pending[0].resolve({ imageUrl: 'old.jpg' }); await tick();
  assert.deepEqual(h.values, [{ imageUrl: 'latest.jpg' }]); h.stop();
});

test('cleanup detaches the listener and ignores late data', async () => {
  const h = harness(); h.stop();
  h.emit({ imageUrl: 'late.jpg' }); h.pending[0].resolve({ imageUrl: 'late.jpg' }); await tick();
  assert.equal(h.stopped, true); assert.deepEqual(h.values, []);
});
