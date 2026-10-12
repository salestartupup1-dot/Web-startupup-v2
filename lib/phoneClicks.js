import { captureAttribution, cleanText } from './lineAttribution.js';

// An event ID deduplicates delivery, not people. No caller identity is collected.
export function phoneClickPayload(anchor, runtime = window) {
  const phone = cleanText(anchor.getAttribute('href')?.replace(/^tel:/i, ''), 40).replace(/[\s()-]/g, '');
  if (!/^\+?\d{8,15}$/.test(phone)) return null;
  return {
    eventId: runtime.crypto.randomUUID(), phone,
    property: { id: cleanText(anchor.dataset.phonePropertyId, 100), name: cleanText(anchor.dataset.phonePropertyName), slug: cleanText(anchor.dataset.phonePropertySlug, 240) },
    pagePath: runtime.location.pathname,
    attribution: captureAttribution(),
  };
}

export function createPhoneClickTracker(runtime = window) {
  let lastKey = '', lastAt = 0;
  return event => {
    if (event.defaultPrevented || event.button !== 0) return;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || !/^tel:/i.test(anchor.getAttribute('href') || '') || anchor.hasAttribute('download')) return;
    try {
      const key = `${anchor.href}:${anchor.dataset.phonePropertyId || ''}:${runtime.location.pathname}`;
      const now = Date.now();
      if (key === lastKey && now - lastAt < 2000) return;
      const payload = phoneClickPayload(anchor, runtime);
      if (!payload) return;
      lastKey = key; lastAt = now;
      // Never wait for tracking or prevent the native dial action.
      const body = JSON.stringify(payload);
      if (runtime.navigator.sendBeacon?.('/api/contact/phone-click', new Blob([body], { type: 'application/json' }))) return;
      void runtime.fetch('/api/contact/phone-click', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
      }).catch(() => {});
    } catch { /* Calling still works with blocked storage, analytics or network. */ }
  };
}
