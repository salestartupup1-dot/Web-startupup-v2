import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSitePage, SHARED_CDN_CACHE } from '../lib/serverPageData.js';
import { loadPublicCatalogue } from '../lib/publicCatalogueClient.js';
import { subscribePublicData } from '../lib/publicDataSubscription.js';
import { propertyPath } from '../lib/propertyRoutes.js';

const house = { id: 'houseA', project_name: 'Project', house_number: '48/195', price: 2790000, inventoryState: 'available' };
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; } });
const company = { name: 'Startup Up', phone: '0', portfolio_years: [{ year: '2025', images: ['a.jpg', 'b.jpg'] }] };
const deps = { canonicalize: async p => ({ ...p, canonicalPath: '/a123bc' }), resolveShort: async () => house.id,
  readProperty: () => ({ promise: Promise.resolve(house) }), enrichProperty: async p => p,
  readCatalogue: async () => ({ properties: [], company, version: 'v1' }) };

test('pages other than the portfolio leave out sold-home albums and record when they were rendered', async () => {
  const before = Date.now();
  for (const url of ['/', '/a123bc']) {
    const res = response();
    const { props } = await loadSitePage({ query: {}, resolvedUrl: url, res }, deps);
    assert.equal(props.initialData.company.name, 'Startup Up');
    assert.equal(props.initialData.company.portfolio_years, undefined);
    assert.ok(props.initialData.renderedAt >= before);
    assert.equal(res.headers['Vercel-CDN-Cache-Control'], SHARED_CDN_CACHE);
  }
  assert.equal(company.portfolio_years.length, 1, 'the shared catalogue object is not modified');
  const { props } = await loadSitePage({ query: { tab: 'portfolio' }, resolvedUrl: '/?tab=portfolio', res: response() }, deps);
  assert.deepEqual(props.initialData.company.portfolio_years, company.portfolio_years);
});

test('a missing house is never cached by the CDN', async () => {
  const res = response();
  await loadSitePage({ query: {}, resolvedUrl: propertyPath(house), res }, { ...deps, readProperty: () => ({ promise: Promise.resolve(null) }) });
  assert.equal(res.headers['Vercel-CDN-Cache-Control'], 'no-store');
});

test('a catalogue request names the revision it saw so the CDN can share it', async () => {
  const seen = [];
  const fetcher = async (url, options) => { seen.push([url, options.cache]); return Response.json({ properties: [], version: 'v 2' }); };
  await loadPublicCatalogue({ fetcher, version: 'v 2' });
  await loadPublicCatalogue({ fetcher, version: 'v 2', includeProperties: false });
  await loadPublicCatalogue({ fetcher });
  assert.deepEqual(seen, [['/api/public-data?v=v+2', 'default'], ['/api/public-data?view=detail&v=v+2', 'default'], ['/api/public-data', 'no-store']]);
});

test('the subscription loads the exact revision it observed', async () => {
  const win = new EventTarget(), page = new EventTarget(); page.visibilityState = 'visible';
  win.setInterval = () => 1; win.clearInterval = () => {};
  const asked = [];
  let push;
  const stop = subscribePublicData({ win, page, initialVersion: 'old',
    observe: (_o, next) => { push = next; return () => {}; },
    load: async version => { asked.push(version); return { version }; },
    onData: () => {}, onError: () => {} });
  push({ metadata: { fromCache: false, hasPendingWrites: false }, exists: () => true, data: () => ({ version: 'new' }) });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(asked, ['new']);
  stop();
});
