import { randomUUID } from 'node:crypto';
import { publicCatalogueStore } from './publicCatalogueStore.js';
import { restrictOptionalReads } from './firestoreQuota.mjs';

const instances = new WeakMap();
// Counts only: no names, LINE IDs, tokens or contact data are placed in cache.
export async function cachedLeadSummary(db, range, load) {
  const ref = db.collection('website_read_snapshots_private').doc('lead_revision');
  const marker = await db.runTransaction(async tx => {
    const existing = (await tx.get(ref)).data();
    if (existing?.version) return existing;
    const initial = { version: randomUUID() };
    tx.set(ref, initial);
    return initial;
  });
  const revision = marker?.version;
  if (!revision) return load(); // Historical data before the first versioned write.
  let state = instances.get(db);
  if (!state) { state = new Map(); instances.set(db, state); }
  const key = `lead-summary:${db.projectId || 'test'}:${revision}:${range.start}:${range.end}`;
  if (state.has(key)) return state.get(key);
  const pending = (async () => {
    const shared = db.projectId && await publicCatalogueStore.get(key);
    if (shared) return shared;
    const budget = (await db.collection('website_read_snapshots_private').doc('quota_budget').get()).data();
    if (restrictOptionalReads(budget)) throw Object.assign(new Error('พักการคำนวณรายงานใหม่ชั่วคราวเพื่อสำรองโควตาให้เว็บไซต์ กรุณาลองหลังรอบโควตาใหม่'), { status: 503 });
    const value = await load();
    if (db.projectId) await publicCatalogueStore.set(key, value);
    return value;
  })();
  if (state.size > 50) state.clear();
  state.set(key, pending);
  try { return await pending; } catch (error) { state.delete(key); throw error; }
}
