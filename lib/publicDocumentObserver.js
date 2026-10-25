import { fetchPublicDocumentRest } from './firestorePublic.js';

// Visitors check the small public revision over HTTP; persistent Firestore
// streams are reserved for an open property or the back office. Hidden tabs
// do not poll. A direct house read still checks the current price immediately.
export function observePublicDocument(path, next, error, {
  read = fetchPublicDocumentRest, intervalMs = 30000, initial = true,
  win = window, page = document,
} = {}) {
  let stopped = false, running = false, controller;
  const refresh = async () => {
    if (stopped || running || page.visibilityState === 'hidden') return;
    running = true;
    controller = new AbortController();
    const timer = win.setTimeout(() => controller.abort(), 8000);
    try {
      const value = await read(path, { cache: 'no-store', signal: controller.signal });
      if (!stopped) next({ metadata: { fromCache: false, hasPendingWrites: false }, exists: () => value !== null, data: () => value });
    } catch (cause) { if (!stopped) error(cause); }
    finally { win.clearTimeout(timer); running = false; }
  };
  const timer = win.setInterval(refresh, intervalMs);
  win.addEventListener('online', refresh);
  page.addEventListener('visibilitychange', refresh);
  if (initial) void refresh();
  return () => {
    stopped = true; controller?.abort(); win.clearInterval(timer);
    win.removeEventListener('online', refresh);
    page.removeEventListener('visibilitychange', refresh);
  };
}
