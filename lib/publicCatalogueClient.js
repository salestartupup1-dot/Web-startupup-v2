// Public visitors use one shared server path. Never fall back to scanning the
// whole Firestore collection in every browser when that server is unavailable.
export async function loadPublicCatalogue({ fetcher = fetch, timeoutMs = 12000, includeProperties = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`/api/public-data${includeProperties ? '' : '?view=detail'}`, { cache: 'no-store', signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('Public catalogue unavailable'), {
      status: response.status, retryable: data.retryable, code: data.code, requestId: data.requestId,
    });
    if ((includeProperties && !Array.isArray(data.properties)) || data.stale) throw new Error('Invalid public catalogue');
    return { props: data.properties || [], company: data.company, visual: data.visual, version: data.version };
  } finally { clearTimeout(timer); }
}
