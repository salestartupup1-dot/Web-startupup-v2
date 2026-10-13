import { getCache } from '@vercel/functions';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

// Runtime Cache survives individual function instances. Revision is part of
// the key; callers must verify it with Firestore before returning cached prices.
const keyFor = version => createHash('sha256').update(String(version)).digest('hex');
async function bounded(operation) {
  let timer;
  try {
    return await Promise.race([operation(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Cache timeout')), 1000);
    })]);
  } catch {
    // Cache is optional. A cache failure must not take down a fresh database read.
    return undefined;
  } finally { clearTimeout(timer); }
}
export const publicCatalogueStore = {
  get: version => bounded(async () => {
    const value = await getCache({ namespace: 'startupup-website-catalogue-v1' }).get(keyFor(version));
    if (typeof value !== 'string') return undefined;
    return JSON.parse(gunzipSync(Buffer.from(value, 'base64'), { maxOutputLength: 16 * 1024 * 1024 }).toString());
  }),
  set: (version, data) => bounded(async () => {
    const value = gzipSync(JSON.stringify(data)).toString('base64');
    if (value.length > 1900000) return;
    await getCache({ namespace: 'startupup-website-catalogue-v1' }).set(keyFor(version), value, { ttl: 86400 });
  }),
};
