import test from 'node:test';
import assert from 'node:assert/strict';
import { requireSiteAdmin } from '../lib/siteAdminAuth.js';

const google = (email, patch = {}) => ({ email, email_verified: true, firebase: { sign_in_provider: 'google.com' }, ...patch });
const deps = (claims, roles = {}) => ({
  auth: () => ({ verifyIdToken: async (token, checkRevoked) => {
    assert.equal(checkRevoked, true);
    if (token !== 'good' || !claims) throw new Error('invalid token');
    return claims;
  } }),
  db: () => ({ doc: (path) => ({ get: async () => {
    const id = path.split('/').pop();
    assert.equal(path, `artifacts/startup-up-realestate/public/data/users/${id}`);
    return { exists: id in roles, get: (field) => roles[id]?.[field] };
  } }) }),
});
const req = (authorization) => ({ headers: authorization ? { authorization } : {} });
const rejects = (promise, status) => assert.rejects(promise, (error) => error.status === status);

test('approved admins and the owner pass; the role comes from users/{email}', async () => {
  assert.deepEqual(await requireSiteAdmin(req('Bearer good'), deps(google('Staff@Example.com'), { 'staff@example.com': { role: 'admin' } })),
    { email: 'staff@example.com', role: 'admin' });
  assert.deepEqual(await requireSiteAdmin(req('Bearer good'), deps(google('startup.up.real.estate@gmail.com'))),
    { email: 'startup.up.real.estate@gmail.com', role: 'host' });
});

test('missing, invalid or anonymous tokens are rejected before any stock is read', async () => {
  await rejects(requireSiteAdmin(req(), deps(google('a@example.com'))), 401);
  await rejects(requireSiteAdmin(req('Bearer bad'), deps(google('a@example.com'))), 401);
  await rejects(requireSiteAdmin(req('Bearer good'), deps({ firebase: { sign_in_provider: 'anonymous' } })), 403);
});

test('unverified or non-Google identities cannot claim an admin email', async () => {
  const roles = { 'staff@example.com': { role: 'admin' } };
  await rejects(requireSiteAdmin(req('Bearer good'), deps(google('staff@example.com', { email_verified: false }), roles)), 403);
  await rejects(requireSiteAdmin(req('Bearer good'), deps(google('staff@example.com', { firebase: { sign_in_provider: 'password' } }), roles)), 403);
  await rejects(requireSiteAdmin(req('Bearer good'), deps(google('startup.up.real.estate@gmail.com', { email_verified: false }))), 403);
});

test('pending, unknown and path-like accounts are refused', async () => {
  await rejects(requireSiteAdmin(req('Bearer good'), deps(google('new@example.com'), { 'new@example.com': { role: 'pending' } })), 403);
  await rejects(requireSiteAdmin(req('Bearer good'), deps(google('nobody@example.com'))), 403);
  await rejects(requireSiteAdmin(req('Bearer good'), deps(google('a/b@example.com'))), 403);
});
