import { getCache } from '@vercel/functions';

const TTL = 60 * 60_000;
async function optional(operation) {
  let timer;
  try { return await Promise.race([operation(), new Promise(resolve => { timer = setTimeout(resolve, 1000); })]); }
  catch { return undefined; } finally { clearTimeout(timer); }
}
// The "check again" button must see highlights saved a minute ago, so a forced read accepts
// only a result younger than this; it still shields Firestore from repeated clicks.
const FORCED_MAX_AGE = 15_000;
export function createHighlightStatusCache({ load, store, now = Date.now }) {
  let cache, pending;
  return async ({ force = false } = {}) => {
    const maxAge = force ? FORCED_MAX_AGE : TTL;
    const usable = entry => entry?.payload && now() - entry.at >= 0 && now() - entry.at < maxAge;
    if (usable(cache)) return cache.payload;
    if (!pending) pending = (async () => {
      const saved = await optional(() => store.get('statuses-v1'));
      if (usable(saved)) { cache = saved; return saved.payload; }
      // Stamp the start, so a slow read does not extend the freshness window.
      const at = now(), payload = await load();
      cache = { at, payload };
      await optional(() => store.set('statuses-v1', cache, { ttl: TTL / 1000 }));
      return payload;
    })().finally(() => { pending = null; });
    return pending;
  };
}
export const highlightStatusStore = {
  get: key => getCache({ namespace: 'startupup-stock-highlights' }).get(key),
  set: (key, value, options) => getCache({ namespace: 'startupup-stock-highlights' }).set(key, value, options),
};
