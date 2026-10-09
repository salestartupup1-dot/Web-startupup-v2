function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

// No catalogue/cache fallback: prices must come from a fresh read.
export async function fetchPublicPropertyApi(slug, { signal, fetcher = fetch, sleep = wait, random = Math.random } = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal?.throwIfAborted();
    try {
      const response = await fetcher(`/api/property?property=${encodeURIComponent(slug)}`, { cache: 'no-store', signal });
      if (response.status === 404) return null;
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const retryAfter = Number(response.headers.get('retry-after'));
        throw Object.assign(new Error('Property read failed'), { status: response.status,
          retryable: body.retryable, requestId: body.requestId,
          retryAfterMs: Number.isFinite(retryAfter) ? Math.min(5000, Math.max(0, retryAfter * 1000)) : 0 });
      }
      const data = await response.json();
      if (!data.property?.id) throw new Error('Invalid property response');
      return data.property;
    } catch (error) {
      if (signal?.aborted || attempt === 2 || error.retryable === false || (error.status < 500 && error.status !== 429)) throw error;
      await sleep(Math.max(error.retryAfterMs || 0, 750 * (2 ** attempt) + random() * 250), signal);
    }
  }
}
