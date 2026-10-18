import { captureAttribution, cleanText } from './lineAttribution.js';

const PENDING_KEY = 'startupup:pending-phone-clicks:v1';
const MAX_AGE = 10 * 60 * 1000;
function eventId(runtime) {
  if (runtime.crypto.randomUUID) return runtime.crypto.randomUUID();
  const bytes = runtime.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function contactKind(anchor, runtime) {
  const href = anchor.getAttribute('href') || '';
  if (/^tel:/i.test(href)) return 'phone_click';
  try {
    const base = runtime.location.href || 'https://www.startupup-real-estate.com/';
    const url = new URL(href, base);
    if ((url.origin === new URL(base).origin && url.pathname === '/line/go')
      || (url.protocol === 'https:' && ['line.me', 'lin.ee', 'liff.line.me'].includes(url.hostname))) return 'line_click';
  } catch { /* Ignore unrelated or malformed destinations. */ }
  return null;
}

// Kept under the original export for older callers. Counts activations, not people.
export function phoneClickPayload(anchor, runtime = window) {
  const kind = contactKind(anchor, runtime);
  if (!kind) return null;
  const phone = kind === 'phone_click' ? cleanText(anchor.getAttribute('href')?.replace(/^tel:/i, ''), 40).replace(/[\s()-]/g, '') : '';
  if (kind === 'phone_click' && !/^\+?\d{8,15}$/.test(phone)) return null;
  const params = kind === 'line_click' ? new URL(anchor.getAttribute('href'), runtime.location.href || 'https://www.startupup-real-estate.com/').searchParams : new URLSearchParams();
  const property = {
    id: cleanText(anchor.dataset.contactPropertyId || anchor.dataset.phonePropertyId || params.get('property'), 100),
    name: cleanText(anchor.dataset.contactPropertyName || anchor.dataset.phonePropertyName || params.get('name')),
    slug: cleanText(anchor.dataset.contactPropertySlug || anchor.dataset.phonePropertySlug, 240),
  };
  const placement = anchor.closest?.('footer') ? 'footer' : (anchor.dataset.contactPlacement === 'sale_page' || property.id ? 'sale_page' : 'other');
  return {
    eventId: eventId(runtime), kind, phone, placement, property,
    pagePath: runtime.location.pathname,
    attribution: captureAttribution(),
  };
}

export function createPhoneClickTracker(runtime = window, onStatus = () => {}) {
  let lastKey = '', lastAt = 0;
  let pending = [];
  const inFlight = new Set();
  try {
    const saved = JSON.parse(runtime.sessionStorage?.getItem(PENDING_KEY) || '[]');
    if (Array.isArray(saved)) pending = saved.filter(item => item?.payload?.eventId && Number.isFinite(item.queuedAt) && Date.now() - item.queuedAt < MAX_AGE).slice(-20);
  } catch { /* Storage is optional, including private browsing. */ }
  const save = () => {
    // LINE reporting now counts connected accounts only; discard old queued activations.
    pending = pending.filter(item => item.payload.kind !== 'line_click' && Date.now() - item.queuedAt < MAX_AGE).slice(-20);
    try { runtime.sessionStorage?.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* Keep the in-memory queue. */ }
  };
  const beacon = payload => {
    try { runtime.navigator.sendBeacon?.('/api/contact/phone-click', new Blob([JSON.stringify(payload)], { type: 'application/json' })); } catch { /* Keep for retry. */ }
  };
  const flush = () => {
    save();
    for (const { payload } of pending) {
      if (inFlight.has(payload.eventId)) continue;
      inFlight.add(payload.eventId);
      // A queued beacon is not an acknowledgement. Keep the event until the
      // server confirms it, then retry the same UUID if a phone app interrupts us.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let delivery;
      try {
        // Start the request inside the activation, before the dialer can suspend JS.
        delivery = runtime.fetch('/api/contact/phone-click', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          keepalive: true, signal: controller.signal,
        });
      } catch (error) { delivery = Promise.reject(error); }
      Promise.resolve(delivery).then(response => {
        runtime.console?.debug?.("[phone-click] delivery status", response.status);
        onStatus(response.ok ? "saved" : `error:${response.status}`);
        if (response.ok || [400, 413, 415].includes(response.status)) {
          pending = pending.filter(item => item.payload.eventId !== payload.eventId); save();
        }
      }).catch(() => { onStatus("retry"); runtime.console?.warn?.("[phone-click] delivery interrupted; retained for retry"); beacon(payload); }).finally(() => { clearTimeout(timeout); inFlight.delete(payload.eventId); });
    }
  };
  const track = event => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || contactKind(anchor, runtime) !== 'phone_click' || anchor.hasAttribute('download')) return;
    runtime.console?.debug?.('[phone-click] activation', event.defaultPrevented, event.button);
    // Other analytics may cancel default navigation and open the dialer themselves.
    // Record the activation independently; touch/keyboard clicks may have no button.
    if (event.button > 0) return;
    try {
      const payload = phoneClickPayload(anchor, runtime);
      if (!payload) return;
      const key = `${anchor.href}:${payload.property.id}:${payload.placement}:${runtime.location.pathname}`;
      const now = Date.now();
      if (key === lastKey && now - lastAt < 2000) return;
      lastKey = key; lastAt = now;
      pending.push({ payload, queuedAt: now }); save();
      runtime.console?.debug?.("[phone-click] queued");
      onStatus("sending");
      // Queue with the browser synchronously before any tel: handoff. Do not wait
      // for visibilitychange, which embedded mobile browsers may never dispatch.
      // The fetch acknowledgement/retries below use the SAME UUID, so this is one click.
      beacon(payload);
      flush();
    } catch { onStatus("error:client"); runtime.console?.warn?.("[phone-click] could not queue tracking; dialing remains available"); }
  };
  track.flush = flush;
  track.beaconPending = () => { save(); pending.forEach(({ payload }) => beacon(payload)); };
  return track;
}

export function installPhoneClickTracking(runtime = window, doc = document, onStatus = () => {}) {
  const track = createPhoneClickTracker(runtime, onStatus);
  runtime.console?.debug?.('[phone-click] tracking installed');
  const visibility = () => doc.visibilityState === 'hidden' ? track.beaconPending() : track.flush();
  // Capture before marketing scripts handle/cancel the bubbling click.
  doc.addEventListener('click', track, true);
  doc.addEventListener('visibilitychange', visibility);
  runtime.addEventListener('pageshow', track.flush);
  runtime.addEventListener('online', track.flush);
  runtime.addEventListener('focus', track.flush);
  track.flush();
  return () => {
    doc.removeEventListener('click', track, true);
    doc.removeEventListener('visibilitychange', visibility);
    runtime.removeEventListener('pageshow', track.flush);
    runtime.removeEventListener('online', track.flush);
    runtime.removeEventListener('focus', track.flush);
  };
}
