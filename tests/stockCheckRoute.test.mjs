import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../pages/api/stock-check.js';

const response = () => {
  const res = { headers: {}, statusCode: 200, body: undefined };
  res.setHeader = (key, value) => { res.headers[key.toLowerCase()] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.end = () => res;
  return res;
};

test('internal stock is refused without an admin login and is never cached publicly', async () => {
  const res = response();
  await handler({ method: 'GET', headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.houses, undefined);
  assert.equal(res.headers['cache-control'], 'private, no-store');
  assert.equal(res.headers.vary, 'Authorization');
});

test('only GET is accepted', async () => {
  const res = response();
  await handler({ method: 'POST', headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'GET');
});
