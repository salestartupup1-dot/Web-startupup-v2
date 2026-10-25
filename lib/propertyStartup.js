// This function also runs inline in <head>, before the application bundle loads.
// Keep it self-contained: never persist a property/price between navigations.
export function startPropertyRequest(win) {
  const url = new URL(win.location.href);
  if (!['/', '/v4', '/v4/'].includes(url.pathname)) return;
  const slug = url.searchParams.get('property');
  if (!slug || !slug.trim() || slug.length > 500) return;
  const controller = new AbortController();
  const request = { slug, startedAt: Date.now(), controller };
  request.timer = win.setTimeout(() => {
    controller.abort();
    if (win.__startupupPropertyRequest === request) delete win.__startupupPropertyRequest;
  }, 12000);
  request.promise = win.fetch(`/api/property?property=${encodeURIComponent(slug)}`, {
    cache: 'no-store', signal: controller.signal,
  });
  // A failed startup request is handled by the normal page retry flow.
  request.promise.catch(() => {});
  win.__startupupPropertyRequest = request;
  win.addEventListener('pagehide', () => {
    controller.abort();
    win.clearTimeout(request.timer);
    if (win.__startupupPropertyRequest === request) delete win.__startupupPropertyRequest;
  }, { once: true });
}

export const PROPERTY_STARTUP_SCRIPT = `(${startPropertyRequest.toString()})(window);`;

// Only the first read of the initial URL can consume this request. Later visits,
// retries and back/forward navigation always check the current price again.
export function takeStartupPropertyResponse(slug, { signal, win = typeof window === 'undefined' ? undefined : window } = {}) {
  const request = win?.__startupupPropertyRequest;
  if (!request) return;
  delete win.__startupupPropertyRequest;
  win.clearTimeout(request.timer);
  if (request.slug !== slug || Date.now() - request.startedAt >= 12000) {
    request.controller.abort();
    return;
  }
  if (signal?.aborted) {
    request.controller.abort();
    signal.throwIfAborted();
  }
  return new Promise((resolve, reject) => {
    const abort = () => { request.controller.abort(); reject(signal.reason); };
    signal?.addEventListener('abort', abort, { once: true });
    request.promise.then(resolve, reject).finally(() => signal?.removeEventListener('abort', abort));
  });
}
