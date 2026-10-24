import test from 'node:test';
import assert from 'node:assert/strict';
import { readListingQuery, listingHref, selectListingProperties, listingPage } from '../lib/listingPagination.js';
import { loadSitePage } from '../lib/serverPageData.js';
import { SEO_LOCATIONS, matchesSeoLocation, locationPath } from '../lib/seoLocations.js';
import { buildPageSeo, buildPropertyJsonLd } from '../lib/seo.js';
import { propertyPath } from '../lib/propertyRoutes.js';
const houses = Array.from({ length: 43 }, (_, i) => ({ id: `house${i}`, project_name: `โครงการ ${i}`, district: 'ลำลูกกา',
  main_location: 'ธัญบุรี', province: 'ปทุมธานี', category: 'ทาวน์เฮาส์', price: 1000000 + i * 10000,
  inventoryState: 'available', property_owner: 'Startup Up', canonicalPath: `/test-${i}` }));
const area = SEO_LOCATIONS.find(p => p.name === 'ลำลูกกา');
const res = () => ({ setHeader() {} });
const deps = { readCatalogue: async () => ({ properties: houses, company: { portfolio_years: [{ year: 2026, images: Array.from({ length: 24 }, (_, i) => `image${i}`) }] } }) };

test('SSR page two uses distinct cards and a self canonical; invalid pages are 404', async () => {
  const result = await loadSitePage({ query: { tab: 'all', page: '2' }, resolvedUrl: '/?tab=all&page=2', res: res() }, deps);
  const data = result.props.initialData;
  assert.equal(data.listing.page, 2);
  assert.equal(listingPage(selectListingProperties(data.properties, data.searchParams, data.listing), 2)[0].id, 'house20');
  assert.equal(listingHref({ listing: data.listing }), '/?tab=all&page=2');
  assert.equal(new URL(buildPageSeo(data).canonicalUrl).search, '?tab=all&page=2');
  assert.equal(new URL(buildPageSeo({ ...data, listing: readListingQuery({}) }).canonicalUrl).search, '?tab=all');
  for (const page of ['0', '-1', '2.5', 'bad', '9999']) {
    assert.equal((await loadSitePage({ query: { tab: 'all', page }, resolvedUrl: `/?tab=all&page=${page}`, res: res() }, deps)).notFound, true);
  }
});

test('links preserve filter/sort choices and the server applies them before pagination', async () => {
  const listing = readListingQuery(new URLSearchParams('page=2&sort=price_desc&area=ลำลูกกา&category=ทาวน์เฮาส์'));
  const href = listingHref({ activeTab: 'search_result', location: area, listing });
  assert.equal(new URL(href, 'https://example.com').searchParams.get('page'), '2');
  const selected = selectListingProperties(houses, {}, listing, area);
  assert.equal(listingPage(selected, 2)[0].id, 'house22');
  assert.equal(readListingQuery(new URLSearchParams(href.split('?')[1])).sort, 'price_desc');
  const data = (await loadSitePage({ query: { page: '2' }, resolvedUrl: `${locationPath(area)}?page=2`, res: res() }, deps)).props.initialData;
  assert.equal(new URL(buildPageSeo(data).canonicalUrl).pathname, locationPath(area));
  assert.equal(new URL(buildPageSeo(data).canonicalUrl).search, '?page=2');
});

test('Thai sara am forms and administrative prefixes match the same district, never Sai Mai', () => {
  for (const district of ['ลำลูกกา', 'ลำลูกกา'.normalize('NFKC'), 'อำเภอลำลูกกา', 'อ. ลำลูกกา']) {
    assert.ok(matchesSeoLocation({ district, main_location: 'ธัญบุรี', province: 'ปทุมธานี' }, area));
  }
  for (const property of [{ district: 'สายไหม' }, { district: '', main_location: 'ลำลูกกา' }, { district: 'ลำลูกกา', province: 'กรุงเทพมหานคร' }]) assert.equal(matchesSeoLocation(property, area), false);
});

test('album pages are addressable and missing albums/pages do not return the first album', async () => {
  const query = { tab: 'portfolio', year: '2026', page: '2' };
  const data = (await loadSitePage({ query, resolvedUrl: '/?tab=portfolio&year=2026&page=2', res: res() }, deps)).props.initialData;
  assert.equal(data.listing.year, '2026'); assert.equal(data.listing.page, 2);
  assert.match(buildPageSeo(data).canonicalUrl, /tab=portfolio&page=2&year=2026$/);
  for (const override of [{ year: 'unknown' }, { page: '3' }]) assert.equal((await loadSitePage({ query: { ...query, ...override }, resolvedUrl: '/?tab=portfolio', res: res() }, deps)).notFound, true);
});

test('house canonical and sold/reserved noindex/schema remain independent of listing query state', () => {
  for (const state of ['available', 'reserved', 'sold']) {
    const property = { ...houses[0], inventoryState: state };
    const plain = buildPageSeo({ selectedProperty: property });
    const paginated = buildPageSeo({ selectedProperty: property, activeTab: 'all', listing: readListingQuery({ page: '2', sort: 'price_desc' }) });
    assert.deepEqual(paginated, plain);
    assert.equal(new URL(plain.canonicalUrl).pathname, propertyPath(property));
    assert.equal(plain.robots, state === 'available' ? 'index,follow' : 'noindex,follow');
    assert.equal(buildPropertyJsonLd(property)['@type'], 'RealEstateListing');
  }
});
