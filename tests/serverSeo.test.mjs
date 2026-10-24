import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyPath, propertyIdFromPath } from '../lib/propertyRoutes.js';
import { loadSitePage } from '../lib/serverPageData.js';
import { buildPageSeo, buildPropertyJsonLd, safeJsonLd } from '../lib/seo.js';
import { includePropertyInSitemap } from '../lib/seoStock.js';
import { SEO_LOCATIONS, matchesSeoLocation } from '../lib/seoLocations.js';
import { subscribePublicData } from '../lib/publicDataSubscription.js';

const house = { id: 'houseA', project_name: 'ไทยสมบูรณ์ 3', house_number: '48/195', custom_id: '48-195', price: 2790000,
  category: 'ทาวน์เฮาส์', main_location: 'คลองหลวง', sub_location: 'คลองสาม', area_wah: 28.4, bedrooms: 3, bathrooms: 2, property_owner: 'Startup Up' };
const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value; } });
const deps = { readProperty: () => ({ promise: Promise.resolve(house) }), readCatalogue: async () => ({ version: 'a', properties: [house] }) };

test('house identity survives duplicate numbers, Thai labels and renamed projects', () => {
  const second = { ...house, id: 'houseB', project_name: 'พฤกษา 32' };
  assert.notEqual(propertyPath(house), propertyPath(second));
  assert.equal(propertyIdFromPath(propertyPath(house)), house.id);
  assert.equal(propertyIdFromPath(decodeURIComponent(propertyPath(house))), house.id);
  assert.equal(propertyIdFromPath('/บ้าน/invalid'), null);
});

test('legacy links redirect permanently, preserve campaign attribution and never render home metadata', async () => {
  const result = await loadSitePage({ query: { property: '48-195' }, resolvedUrl: '/?property=48-195&utm_source=google', res: response() }, deps);
  assert.equal(result.redirect.permanent, true);
  assert.equal(result.redirect.destination, `${propertyPath(house)}?utm_source=google`);
});

test('canonical houses are fully seeded and read a fresh price for each request', async () => {
  let price = 2790000, reads = 0;
  const injected = { ...deps, readProperty: () => { reads++; return { promise: Promise.resolve({ ...house, price }) }; } };
  const context = { query: {}, resolvedUrl: propertyPath(house), res: response() };
  const first = await loadSitePage(context, injected);
  assert.equal(first.props.initialData.selectedProperty.price, 2790000);
  price = 2690000;
  const next = await loadSitePage(context, injected);
  assert.equal(next.props.initialData.selectedProperty.price, 2690000);
  assert.equal(reads, 2);
  assert.equal(context.res.headers['Cache-Control'], 'no-store');
  const seo = buildPageSeo({ selectedProperty: next.props.initialData.selectedProperty });
  assert.ok(seo.title.includes('2,690,000'));
  assert.ok(seo.canonicalUrl.endsWith(propertyPath(house)));
});

test('missing records return 404; outages return 503, not home or an empty index', async () => {
  const context = { query: {}, resolvedUrl: propertyPath(house), res: response() };
  assert.deepEqual(await loadSitePage(context, { ...deps, readProperty: () => ({ promise: Promise.resolve(null) }) }), { notFound: true });
  const result = await loadSitePage(context, { ...deps, readProperty: () => ({ promise: Promise.reject(new Error('offline')) }) });
  assert.equal(context.res.statusCode, 503);
  assert.equal(context.res.headers['Retry-After'], '60');
  assert.equal(result.props.unavailable, true);
});

test('home and listing tabs are populated before browser JavaScript', async () => {
  const result = await loadSitePage({ query: { tab: 'all' }, resolvedUrl: '/?tab=all', res: response() }, deps);
  assert.equal(result.props.initialData.activeTab, 'all');
  assert.equal(result.props.initialData.properties[0].price, house.price);
  assert.ok(buildPageSeo({ activeTab: 'all' }).canonicalUrl.endsWith('/?tab=all'));
});

test('schema describes a real estate listing, accurate land units and no invented reviews', () => {
  const schema = buildPropertyJsonLd(house);
  assert.equal(schema['@type'], 'RealEstateListing');
  assert.equal(schema.offers.price, house.price);
  assert.equal(schema.about.numberOfBedrooms, 3);
  assert.equal(schema.about.additionalProperty[0].unitText, 'ตารางวา');
  assert.equal(schema.about.floorSize, undefined);
  assert.equal(schema.aggregateRating, undefined);
  assert.ok(!safeJsonLd({ text: '</script>' }).includes('<'));
  assert.equal(buildPropertyJsonLd({ ...house, badge: 'Sold Out' }).offers.availability, 'https://schema.org/SoldOut');
});

test('sitemap follows verified stock status and never matches by house number alone', () => {
  const row = { key: '48/195', project: house.project_name, owner: 'Startup Up', status: 'ว่าง', sold: false };
  const stock = status => ({ coveredOwners: ['Startup Up'], rows: [{ ...row, status }] });
  for (const status of ['ว่าง', 'ยังไม่เสร็จ', 'ยื่นซ้อนได้']) assert.equal(includePropertyInSitemap(house, stock(status)), true);
  for (const status of ['ยื่นกู้', 'ประเมิน', 'รอโอน', 'ขายแล้ว']) assert.equal(includePropertyInSitemap(house, stock(status)), false);
  assert.equal(includePropertyInSitemap({ ...house, project_name: 'โครงการอื่น' }, stock('ว่าง')), false);
  assert.equal(includePropertyInSitemap({ ...house, badge: 'Sold Out' }, stock('ว่าง')), false);
  assert.equal(includePropertyInSitemap({ ...house, property_owner: 'Notting' }, stock('ว่าง')), false);
});

test('all five location pages use explicit districts, not keyword substring collisions', () => {
  assert.equal(SEO_LOCATIONS.length, 5);
  assert.ok(matchesSeoLocation(house, SEO_LOCATIONS[0]));
  assert.ok(matchesSeoLocation(house, SEO_LOCATIONS[1]));
  assert.ok(!matchesSeoLocation({ ...house, main_location: 'กรุงเทพมหานคร', sub_location: 'คลองสามวา' }, SEO_LOCATIONS[1]));
  assert.ok(matchesSeoLocation({ ...house, main_location: 'ปทุมธานี', sub_location: 'คลองหลวง' }, SEO_LOCATIONS[1]));
});

test('SSR revision seed avoids an immediate duplicate fetch but reloads changed data', async () => {
  let notify, loads = 0, data;
  const noop = () => {};
  const win = { addEventListener: noop, removeEventListener: noop, setInterval: () => 1, clearInterval: noop };
  const page = { ...win, visibilityState: 'visible' };
  const stop = subscribePublicData({ win, page, initialVersion: 'one',
    observe: (_options, next) => { notify = next; return noop; },
    load: async () => { loads++; return { version: 'two', price: 2690000 }; },
    onData: value => { data = value; }, onError: error => { throw error; },
  });
  const snapshot = version => ({ exists: () => true, data: () => ({ version }), metadata: { fromCache: false, hasPendingWrites: false } });
  notify(snapshot('one'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(loads, 0);
  notify(snapshot('two'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(loads, 1);
  assert.equal(data.price, 2690000);
  stop();
});
