import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { highlightId, matchWebsiteHouse, effectiveHighlights, nextHighlight, highlightLines, websiteHouseNumberVariants } from '../lib/highlights.mjs';
const house = { project: 'พฤกษา 115 **', houseNumber: '45/193' };
test('stable house identity ignores row order and cosmetic whitespace; never shares another project or unit', async () => {
  const id = await highlightId(house);
  assert.equal(id, await highlightId({ project: 'พฤกษา115', houseNumber: '45/193', rowIndex: 8 }));
  assert.notEqual(id, await highlightId({ ...house, project: 'พฤกษา 116' }));
  assert.notEqual(id, await highlightId({ ...house, houseNumber: '45/194' }));
  assert.equal(await highlightId({ project: '', houseNumber: '1' }), null);
});
test('website matching requires project plus house and rejects ambiguous matches', () => {
  const candidate = { ...house, id: 'one', highlights: 'ติดถนน' };
  assert.equal(matchWebsiteHouse(house, [candidate]), candidate);
  assert.equal(matchWebsiteHouse(house, [candidate, { ...candidate, id: 'two' }]), null);
  assert.equal(matchWebsiteHouse(house, [{ ...candidate, project: 'อื่น' }]), null);
});
test('verified source spelling and abbreviations recover all eight affected stock houses', () => {
  const properties = JSON.parse(readFileSync(new URL('../data/website-coords.json', import.meta.url))).properties;
  for (const [project, houseNumber] of [
    ['ไทยสมบูรณ์ 2', '34/74'], ['ไทยสมบูรณ์ 3', '48/66'], ['ไทยสมบูรณ์ 3', '48/74'],
    ['เอื้ออาทรคลองสาม', '33/345'], ['พลีโน่ รังสิตคลอง 4', '88/383'],
    ['แอร์วิลล่า', '5/557'], ['แอร์วิลล่า', '5/833'], ['มนชญา 1', '121/295'],
  ]) assert.ok(matchWebsiteHouse({ project, houseNumber }, properties)?.highlights, `${project} ${houseNumber}`);
});
test('source aliases preserve project phases, unit boundaries, ambiguity checks and saved identities', async () => {
  const candidate = { project: 'ไทยสมบรูณ์ 3', houseNumber: '48/74', id: 'one' };
  const target = { project: 'ไทยสมบูรณ์ 3', houseNumber: '48/74' };
  assert.equal(matchWebsiteHouse(target, [candidate]), candidate);
  assert.equal(matchWebsiteHouse({ ...target, project: 'ไทยสมบูรณ์ 2' }, [candidate]), null);
  assert.equal(matchWebsiteHouse({ ...target, houseNumber: '48/75' }, [candidate]), null);
  assert.equal(matchWebsiteHouse(target, [candidate, { ...candidate, id: 'two' }]), null);
  assert.notEqual(await highlightId(target), await highlightId(candidate));
  const abbreviated = { project: 'พลีโน่', houseNumber: '88/383', id: 'WgBuvAZucfHxB1xcgquD' };
  const pleno = { project: 'พลีโน่ รังสิตคลอง 4', houseNumber: '88/383' };
  assert.equal(matchWebsiteHouse(pleno, [abbreviated]), abbreviated);
  assert.equal(matchWebsiteHouse(pleno, [{ ...abbreviated, id: 'unverified' }]), null);
  assert.equal(matchWebsiteHouse({ ...pleno, project: 'พลีโน่ รังสิตคลอง 3' }, [abbreviated]), null);
  assert.equal(matchWebsiteHouse({ ...pleno, houseNumber: '88/384' }, [{ ...abbreviated, houseNumber: '88/384' }]), null);
});
test('custom wording including intentionally empty text wins; reset restores latest website wording', () => {
  assert.equal(effectiveHighlights({ mode: 'custom', text: '' }, 'website'), '');
  assert.equal(effectiveHighlights({ mode: 'custom', text: 'custom' }, 'website'), 'custom');
  const updated = nextHighlight({ revision: 4 }, 4, house, 'website', 'old', 'time');
  assert.equal(updated.text, ''); assert.equal(updated.revision, 5);
  assert.equal(effectiveHighlights(updated, 'website updated'), 'website updated');
  assert.throws(() => nextHighlight({ revision: 5 }, 4, house, 'custom', 'stale', 'time'), /อีกเครื่อง/);
  assert.throws(() => nextHighlight(null, 0, house, 'custom', 'x'.repeat(4001), 'time'));
  assert.deepEqual(highlightLines('👉 จุดเด่น\n- ติดถนน\n\n• ใกล้โรงเรียน'), ['ติดถนน', 'ใกล้โรงเรียน']);
});
test('slash and dash address formats match without merging other units or changing saved IDs', async () => {
  const target = { project: 'พฤกษา 13', houseNumber: '37/1331' };
  const source = { ...target, id: 'source', houseNumber: '37-1331' };
  for (const houseNumber of ['37-1331', '37–1331', '37—1331', '37／1331', ' 37 / 1331 ']) {
    const variant = { ...source, houseNumber };
    assert.equal(matchWebsiteHouse(target, [variant]), variant);
  }
  assert.equal(matchWebsiteHouse(target, [{ ...source, houseNumber: '371/331' }]), null);
  assert.equal(matchWebsiteHouse(target, [{ ...source, project: 'พฤกษา 113' }]), null);
  assert.equal(matchWebsiteHouse(target, [source, { ...target, id: 'duplicate' }]), null);
  assert.notEqual(await highlightId(target), await highlightId(source));
  assert.ok(websiteHouseNumberVariants('37/1331').includes('37-1331'));
  assert.ok(websiteHouseNumberVariants('37-1331').includes('37/1331'));
  const properties = JSON.parse(readFileSync(new URL('../data/website-coords.json', import.meta.url))).properties;
  assert.equal(matchWebsiteHouse(target, properties)?.id, 'asu1rRYtB01ATmjWoa1H');
  assert.ok(matchWebsiteHouse(target, properties)?.highlights);
});
