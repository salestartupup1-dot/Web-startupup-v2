import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHighlightStatuses, fetchHighlightProperties, summarizeHighlightStatuses } from '../lib/highlightSummary.mjs';
import { highlightId, highlightKey } from '../lib/highlights.mjs';
const house = number => ({ project: 'โครงการหนึ่ง', houseNumber: number });

test('summary counts effective content: custom, blank custom, reset, absent website and heading-only text', async () => {
  const houses = ['1', '2', '3', '4', '5', '6'].map(house);
  const properties = houses.slice(0, 4).map(h => ({ ...h, highlights: 'ใกล้ตลาด' }));
  properties.push({ ...houses[5], highlights: '👉 จุดเด่น\n - ' });
  const overrides = [null, { mode: 'custom', text: '' }, { mode: 'website', text: '' }, null, { mode: 'custom', text: 'กรอกเอง' }, null];
  const ids = await Promise.all(houses.map(highlightId));
  let calls = 0;
  const fetcher = async (_url, options) => {
    calls++;
    const request = JSON.parse(options.body);
    assert.equal(request.documents.length, 6);
    const rows = request.documents.map(name => {
      const override = overrides[ids.indexOf(name.split('/').pop())];
      return override ? { found: { name, fields: { mode: { stringValue: override.mode }, text: { stringValue: override.text } } } } : { missing: name };
    }).reverse(); // BatchGet does not guarantee request order.
    return { ok: true, json: async () => rows };
  };
  const statuses = await buildHighlightStatuses([...houses, houses[0]], properties, fetcher);
  assert.equal(calls, 1);
  assert.deepEqual(houses.map(h => statuses[highlightKey(h)]), [true, false, true, true, true, false]);
  const summary = summarizeHighlightStatuses([...houses, house('new')], statuses);
  assert.equal(summary.complete, 4);
  assert.deepEqual(summary.missing.map(h => h.houseNumber), ['2', '6']);
  assert.deepEqual(summary.unknown.map(h => h.houseNumber), ['new']);
});

test('source failures and incomplete override responses never become missing highlights', async () => {
  await assert.rejects(buildHighlightStatuses([house('1')], [], async () => ({ ok: false })));
  await assert.rejects(buildHighlightStatuses([house('1')], [], async () => ({ ok: true, json: async () => [] })), /Incomplete/);
  await assert.rejects(fetchHighlightProperties(async () => ({ ok: false })));
});

test('source uses the website shared catalogue instead of scanning Firestore', async () => {
  let calls = 0;
  const properties = await fetchHighlightProperties(async url => {
    calls++;
    assert.equal(url, 'https://www.startupup-real-estate.com/api/map-data');
    return { ok: true, json: async () => ({ properties: [{ id: 'one', project: 'Test', houseNumber: '1', highlights: 'Near transit' }] }) };
  });
  assert.equal(calls, 1);
  assert.equal(properties.length, 1);
});

test('Pruksa 13 slash/dash regression is counted as complete in the summary', async () => {
  const target = { project: 'พฤกษา 13', houseNumber: '37/1331' };
  const source = { ...target, houseNumber: '37-1331', highlights: 'ต้นโครงการ\nมีพื้นที่ข้างบ้าน' };
  const statuses = await buildHighlightStatuses([target], [source], async (_url, options) => ({
    ok: true, json: async () => JSON.parse(options.body).documents.map(missing => ({ missing })),
  }));
  assert.equal(statuses[highlightKey(target)], true);
  assert.equal(summarizeHighlightStatuses([target], statuses).missing.length, 0);
});
