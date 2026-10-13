import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-stock-highlights', firestore: { host: '127.0.0.1', port: 8092, rules: readFileSync('security/firestore.rules', 'utf8') } });
await env.clearFirestore();
const context = (uid, verified = true) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: verified }).firestore();
const admin = context('admin'), pending = context('pending'), outsider = context('outsider'), unverified = context('admin', false), publicDb = env.unauthenticatedContext().firestore();
const ref = (db, id = 'a'.repeat(64)) => doc(db, 'stock_map_highlights', id);
const payload = (extra = {}) => ({ project: 'test', houseNumber: '1/1', mode: 'custom', text: 'test highlight', revision: 1, updatedAt: serverTimestamp(), ...extra });
await env.withSecurityRulesDisabled(async c => {
  for (const role of ['admin', 'pending']) await setDoc(doc(c.firestore(), 'artifacts/startup-up-realestate/public/data/users', `${role}@example.com`), { role });
});
test.after(async () => env.cleanup());
test('public can read only an individual highlight; only verified existing admin/host writes', async () => {
  await assertSucceeds(setDoc(ref(admin), payload()));
  await assertSucceeds(getDoc(ref(publicDb)));
  for (const db of [pending, outsider, unverified, publicDb]) {
    await assertFails(setDoc(ref(db, 'b'.repeat(64)), payload()));
    await assertFails(updateDoc(ref(db), { text: 'unauthorized', revision: 2, updatedAt: serverTimestamp() }));
  }
  await assertFails(getDocs(collection(publicDb, 'stock_map_highlights')));
  await assertFails(deleteDoc(ref(admin)));
});
test('create and update validate content, immutable house identity, revision and server time', async () => {
  for (const extra of [{ text: 'x'.repeat(4001) }, { text: 3 }, { mode: 'bad' }, { mode: 'website' }, { revision: 0 }, { injected: true }, { updatedAt: 'fake' }, { project: '' }]) {
    await assertFails(setDoc(ref(admin, 'c'.repeat(64)), payload(extra)));
    await assertFails(updateDoc(ref(admin), { ...extra, updatedAt: extra.updatedAt || serverTimestamp() }));
  }
  await assertFails(updateDoc(ref(admin), { project: 'other', revision: 2, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref(admin), { houseNumber: '2', revision: 2, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref(admin), { mode: 'website', text: '', revision: 2, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref(admin), { text: 'stale', revision: 2, updatedAt: serverTimestamp() }));
  await assertSucceeds(setDoc(ref(admin), payload({ revision: 3, text: '' })));
});
