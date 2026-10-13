import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-site-rules', firestore: { host: '127.0.0.1', port: 8092, rules: readFileSync('security/firestore.rules', 'utf8') } });
await env.clearFirestore();
const base = 'artifacts/startup-up-realestate/public/data';
const user = (email, verified = true) => env.authenticatedContext(email.replace(/\W/g, '-'), { email, email_verified: verified }).firestore();
await env.withSecurityRulesDisabled(async c => {
  await setDoc(doc(c.firestore(), `${base}/users`, 'staff@example.com'), { role: 'admin' });
  await setDoc(doc(c.firestore(), `${base}/users`, 'boss@example.com'), { role: 'host' });
});
test.after(async () => env.cleanup());

test('an unverified token carrying an admin or owner email gets no write access', async () => {
  for (const email of ['staff@example.com', 'boss@example.com', 'startup.up.real.estate@gmail.com']) {
    const db = user(email, false);
    await assertFails(setDoc(doc(db, `${base}/properties`, 'p1'), { price: 1 }));
    await assertFails(setDoc(doc(db, `${base}/company_info`, 'main'), { phone: 'x' }));
    await assertFails(setDoc(doc(db, `${base}/site_settings`, 'visual'), { a: 1 }));
    await assertFails(updateDoc(doc(db, `${base}/users`, 'staff@example.com'), { role: 'host' }));
  }
});

test('verified admins and hosts keep their existing access', async () => {
  await assertSucceeds(setDoc(doc(user('staff@example.com'), `${base}/properties`, 'p1'), { price: 1 }));
  await assertFails(setDoc(doc(user('staff@example.com'), `${base}/company_info`, 'main'), { phone: 'x' }));
  await assertSucceeds(setDoc(doc(user('boss@example.com'), `${base}/company_info`, 'main'), { phone: 'x' }));
  await assertSucceeds(setDoc(doc(user('startup.up.real.estate@gmail.com'), `${base}/site_settings`, 'visual'), { a: 1 }));
});

test('self-registration is pending-only and must name the signed-in account', async () => {
  const req = (extra = {}) => ({ email: 'new@example.com', role: 'pending', name: 'New', createdAt: serverTimestamp(), ...extra });
  const db = user('new@example.com');
  for (const extra of [{ role: 'admin' }, { email: 'staff@example.com' }, { injected: true }, { name: 'x'.repeat(201) }]) {
    await assertFails(setDoc(doc(db, `${base}/users`, 'new@example.com'), req(extra)));
  }
  await assertFails(setDoc(doc(user('new@example.com', false), `${base}/users`, 'new@example.com'), req()));
  await assertFails(setDoc(doc(db, `${base}/users`, 'other@example.com'), req({ email: 'other@example.com' })));
  await assertSucceeds(setDoc(doc(db, `${base}/users`, 'new@example.com'), req()));
  await assertFails(updateDoc(doc(db, `${base}/users`, 'new@example.com'), { role: 'admin' }));
});
