import { randomUUID, createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const busy = () => Object.assign(new Error('Catalogue refresh in progress'), { code: 'REFRESH_PENDING', retryable: true });

// Private compressed snapshot + lease survives cache eviction and coordinates
// different Vercel instances. Only cache misses touch this document.
export function createCatalogueCoordinator({ database, now = Date.now, sleep = pause }) {
  return async (key, load) => {
    const db = await database();
    const ref = db.collection('website_read_snapshots_private').doc(createHash('sha256').update(key.split(':')[0]).digest('hex'));
    const owner = randomUUID();
    const claim = await db.runTransaction(async tx => {
      const state = (await tx.get(ref)).data() || {};
      if (state.key === key && state.value) return { value: state.value };
      if (state.leaseUntil > now()) return { waiting: true };
      tx.set(ref, { owner, leaseUntil: now() + 30000 }, { merge: true });
      return { owner };
    });
    const decode = value => JSON.parse(gunzipSync(Buffer.from(value, 'base64'), { maxOutputLength: 16 * 1024 * 1024 }).toString());
    if (claim.value) return decode(claim.value);
    if (claim.waiting) {
      for (let i = 0; i < 4; i++) {
        await sleep(500 * (i + 1));
        const state = (await ref.get()).data();
        if (state?.key === key && state.value) return decode(state.value);
        if (!state?.leaseUntil || state.leaseUntil <= now()) break;
      }
      throw busy();
    }
    try {
      const value = await load();
      const encoded = gzipSync(JSON.stringify(value)).toString('base64');
      if (encoded.length > 900000) throw Object.assign(new Error('Catalogue snapshot too large'), { code: 'SNAPSHOT_TOO_LARGE' });
      await db.runTransaction(async tx => {
        const state = (await tx.get(ref)).data();
        if (state?.owner !== owner || state.leaseUntil <= now()) throw busy();
        tx.set(ref, { key, value: encoded, owner: '', leaseUntil: 0 });
      });
      return value;
    } catch (error) {
      await db.runTransaction(async tx => {
        if ((await tx.get(ref)).data()?.owner === owner) tx.set(ref, { owner: '', leaseUntil: 0 }, { merge: true });
      }).catch(() => {});
      throw error;
    }
  };
}
export const coordinateCatalogue = createCatalogueCoordinator({ database: async () => {
  const { leadDb } = await import('./lineServer.js');
  const db = leadDb();
  if (db.projectId !== 'startup-up-realestate') throw new Error('Catalogue database mismatch');
  return db;
} });
