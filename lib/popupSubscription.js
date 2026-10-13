// The popup's first read must not wait for the catalogue, authentication or the
// realtime connection. A confirmed snapshot always supersedes an older request.
export function subscribePopup({ load, observe, onData, onError = () => {}, win = window, page = document, now = Date.now }) {
  let disposed = false, snapshotRevision = 0, requestId = 0;
  let controller, retry = false, listenerFailed = false;
  let running = false, retryNotBefore = 0, failures = 0;
  const refresh = async () => {
    if (disposed || running || now() < retryNotBefore) return;
    running = true;
    controller?.abort();
    const requestController = new AbortController();
    controller = requestController;
    const id = ++requestId;
    const revision = snapshotRevision;
    const timeout = win.setTimeout(() => requestController.abort(), 8000);
    try {
      const data = await load({ cache: 'no-store', signal: requestController.signal });
      if (!disposed && id === requestId && revision === snapshotRevision) {
        retry = false;
        failures = 0;
        retryNotBefore = 0;
        onData(data);
      }
    } catch (error) {
      if (!disposed && id === requestId && revision === snapshotRevision) {
        retry = true;
        failures += 1;
        retryNotBefore = now() + (error.retryable === false ? 300000 : Math.min(300000, 15000 * 2 ** (failures - 1)));
        onData(null);
        onError(error);
      }
    } finally {
      win.clearTimeout(timeout);
      running = false;
    }
  };
  refresh();
  const stop = observe({ includeMetadataChanges: true }, snapshot => {
    if (disposed || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    snapshotRevision++;
    retry = false;
    listenerFailed = false;
    failures = 0;
    retryNotBefore = 0;
    onData(snapshot.exists() ? snapshot.data() : null);
  }, () => {
    listenerFailed = true;
  });
  const resume = () => { if (page.visibilityState !== 'hidden') refresh(); };
  win.addEventListener('focus', resume);
  win.addEventListener('online', resume);
  page.addEventListener('visibilitychange', resume);
  const timer = win.setInterval(() => { if (retry || listenerFailed) resume(); }, 15000);
  return () => {
    disposed = true;
    controller?.abort();
    stop();
    win.clearInterval(timer);
    win.removeEventListener('focus', resume);
    win.removeEventListener('online', resume);
    page.removeEventListener('visibilitychange', resume);
  };
}
