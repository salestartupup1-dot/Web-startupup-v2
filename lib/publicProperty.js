// Same-origin reads also work when a browser/network cannot reach Firebase directly.
// Never fall back to catalogue prices: a successful response must be a fresh house read.
export async function fetchPublicPropertyApi(slug, { signal, fetcher = fetch } = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    signal?.throwIfAborted();
    try {
      const response = await fetcher(`/api/property?property=${encodeURIComponent(slug)}`, { cache: 'no-store', signal });
      if (response.status === 404) return null;
      if (!response.ok) throw Object.assign(new Error('Property read failed'), { status: response.status });
      const data = await response.json();
      if (!data.property?.id) throw new Error('Invalid property response');
      return data.property;
    } catch (error) {
      if (signal?.aborted || attempt === 1 || (error.status < 500 && error.status !== 429)) throw error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
}
