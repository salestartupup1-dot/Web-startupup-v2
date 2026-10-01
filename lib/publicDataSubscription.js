import { publicDataVersion } from './publicDataVersion.js';

// Listen to one revision document, not the entire catalogue for every visitor.
// A change during an HTTP request supersedes that response and queues one reload.
export function subscribePublicData({ observe, load, onData, onError,
  win = window, page = document, retryMs = 15000 }) {
  let disposed = false;
  let running = false;
  let pending = false;
  let generation = 0;
  let seenVersion;
  let needsRetry = false;
  let listenerFailed = false;
  const refresh = async () => {
    if (disposed) return;
    generation += 1;
    pending = true;
    if (running) return;
    running = true;
    while (pending && !disposed) {
      pending = false;
      const current = generation;
      try {
        const data = await load();
        if (!disposed && current === generation) {
          needsRetry = false;
          onData(data);
        }
      } catch (error) {
        if (!disposed && current === generation) {
          needsRetry = true;
          onError(error);
        }
      }
    }
    running = false;
  };
  const stop = observe({ includeMetadataChanges: true }, snapshot => {
    if (disposed || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    const version = snapshot.exists() ? publicDataVersion(snapshot.data()) : null;
    listenerFailed = !version;
    if (version !== seenVersion) {
      seenVersion = version;
      refresh();
    }
  }, () => {
    if (disposed) return;
    listenerFailed = true;
    refresh();
  });
  const resume = () => { if (page.visibilityState !== 'hidden') refresh(); };
  win.addEventListener('focus', resume);
  win.addEventListener('online', resume);
  win.addEventListener('pageshow', resume);
  page.addEventListener('visibilitychange', resume);
  const timer = win.setInterval(() => {
    if (needsRetry || listenerFailed) resume();
  }, retryMs);
  refresh();
  return () => {
    disposed = true;
    stop();
    win.clearInterval(timer);
    win.removeEventListener('focus', resume);
    win.removeEventListener('online', resume);
    win.removeEventListener('pageshow', resume);
    page.removeEventListener('visibilitychange', resume);
  };
}
