// The popup's first read must not wait for the catalogue, authentication or the
// realtime connection. A confirmed snapshot always supersedes an older request.
export function subscribePopup({ load, observe, onData, onError = () => {}, win = window, page = document }) {
  let disposed = false, snapshotRevision = 0, requestId = 0;
  let controller, retry = false, listenerFailed = false;
  const refresh = async () => {
    if (disposed) return;
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
        onData(data);
      }
    } catch (error) {
      if (!disposed && id === requestId && revision === snapshotRevision) {
        retry = true;
        onData(null);
        onError(error);
      }
    } finally {
      win.clearTimeout(timeout);
    }
  };
  refresh();
  const stop = observe({ includeMetadataChanges: true }, snapshot => {
    if (disposed || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    snapshotRevision++;
    retry = false;
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
