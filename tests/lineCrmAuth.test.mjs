import test from 'node:test';
import assert from 'node:assert/strict';
import { requireCrmLeadSourceMember } from '../lib/lineCrmAuth.js';

const token = (patch = {}) => 'Bearer header.' + Buffer.from(JSON.stringify({ sub: 'approved-member', aud: 'startup-up-crm',
  iss: 'https://securetoken.google.com/startup-up-crm', ...patch })).toString('base64url') + '.signature';
const member = (role, active = true) => Response.json({ fields: { active: { booleanValue: active }, role: { stringValue: role } } });

test('all six approved CRM roles may read sources, verified with the original bearer token', async () => {
  for (const role of ['owner', 'admin', 'senior_sales', 'sales', 'editor', 'viewer']) {
    const authorization = token();
    const actual = await requireCrmLeadSourceMember(authorization, async (url, options) => {
      assert.equal(url, 'https://firestore.googleapis.com/v1/projects/startup-up-crm/databases/(default)/documents/users/approved-member');
      assert.equal(options.headers.Authorization, authorization);
      assert.equal(options.cache, 'no-store');
      return member(role);
    });
    assert.deepEqual(actual, { uid: 'approved-member', role });
  }
});

test('missing/malformed/wrong-project tokens are rejected before any database request', async () => {
  for (const authorization of [undefined, 'Bearer nonsense', token({ aud: 'other' }), token({ iss: 'fake' }), token({ sub: '../owner' })]) {
    await assert.rejects(requireCrmLeadSourceMember(authorization, () => { throw new Error('must not fetch'); }), { status: 401 });
  }
});

test('forged or expired tokens cannot bypass Firestore validation', async () => {
  await assert.rejects(requireCrmLeadSourceMember(token(), async () => new Response('', { status: 401 })), { status: 401 });
});

test('unapproved, disabled, missing and unknown-role members have no access', async () => {
  for (const [role, active] of [['owner', false], ['pending', true], ['', true]]) {
    await assert.rejects(requireCrmLeadSourceMember(token(), async () => member(role, active)), { status: 403 });
  }
  for (const status of [403, 404]) await assert.rejects(requireCrmLeadSourceMember(token(), async () => new Response('', { status })), { status: 403 });
});

test('membership is rechecked on every read, and a verification outage fails closed', async () => {
  let active = true;
  const verify = () => requireCrmLeadSourceMember(token(), async () => member('sales', active));
  await verify(); active = false;
  await assert.rejects(verify(), { status: 403 });
  await assert.rejects(requireCrmLeadSourceMember(token(), async () => { throw new Error('offline'); }), { status: 503 });
  await assert.rejects(requireCrmLeadSourceMember(token(), async () => new Response('', { status: 429 })), { status: 503 });
});
