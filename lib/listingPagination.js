import { matchesSeoLocation, seoLocationFromSearch, locationPath } from './seoLocations.js';
import { availableInLocation, isSaleAvailable } from './websiteInventory.js';
import { selectSoldHomes } from './soldHomes.js';

export const LISTING_PAGE_SIZE = 20;
export const emptyListing = () => ({ page: 1, sort: '', areas: [], categories: [], year: '', near: '' });
export const isListingTab = tab => ['all', 'promo', 'search_result', 'portfolio'].includes(tab);
export function readListingQuery(query = {}) {
  const values = key => query instanceof URLSearchParams ? query.getAll(key) : [query[key]].flat().filter(v => v != null);
  const first = key => String(values(key)[0] || '');
  const page = Number(first('page'));
  const list = key => [...new Set(values(key).filter(v => typeof v === 'string' && v.trim()).map(v => v.trim().slice(0, 100)))].slice(0, 30);
  return { page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    sort: ['latest', 'price_asc', 'price_desc'].includes(first('sort')) ? first('sort') : '',
    areas: list('area'), categories: list('category'), year: first('year').slice(0, 20),
    // ?near= only reorders (ad links name an area); it is never written back as a listing filter.
    near: first('near').trim().slice(0, 100) };
}
export function appendListingQuery(params, listing = {}) {
  if (listing.page > 1) params.set('page', String(listing.page));
  if (listing.sort) params.set('sort', listing.sort);
  for (const area of listing.areas || []) params.append('area', area);
  for (const category of listing.categories || []) params.append('category', category);
  if (listing.year) params.set('year', listing.year);
  return params;
}
export function listingHref({ activeTab = 'all', searchParams, location, listing = {}, page = listing.page || 1, basePath = '/' }) {
  const params = new URLSearchParams();
  const area = location || (activeTab === 'search_result' && seoLocationFromSearch(searchParams));
  const path = area ? locationPath(area) : basePath;
  if (!area) {
    params.set('tab', activeTab);
    if (activeTab === 'search_result' && searchParams?.value) {
      params.set('sType', searchParams.type); params.set('sValue', searchParams.value);
      if (searchParams.area) params.set('sArea', searchParams.area);
    }
  }
  appendListingQuery(params, { ...listing, page });
  return path + (params.size ? `?${params}` : '');
}
const mainArea = (p, area) => {
  const location = seoLocationFromSearch({ type: 'district', value: area });
  if (location) return matchesSeoLocation(p, location);
  return p.main_location ? p.main_location === area : p.district === area || p.subdistrict === area;
};
const subArea = (p, area) => p.sub_location ? p.sub_location === area : p.subdistrict === area;
const categoryMatches = (p, value) => value === 'ทาวน์เฮาส์' ? p.category?.includes(value) : p.category === value;
const normalizeSearch = text => String(text || '').toLowerCase().replace(/[0-9]/g, digit => ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'][Number(digit)]).replace(/\s+/g, '');
export function selectListingProperties(properties, search = {}, listing = {}, location) {
  let result = [...properties];
  if (search.type === 'sold') result = selectSoldHomes(result);
  else if (location) result = availableInLocation(result, location);
  else {
    // Everywhere except the sold portfolio, only houses that can still be booked are listed.
    result = result.filter(isSaleAvailable);
    if (search.type === 'promo') result = result.filter(p => p.badge === 'Promotion');
    else if (['location_group', 'main_location', 'district'].includes(search.type)) result = result.filter(p => mainArea(p, search.value));
    else if (search.type === 'sub_location') result = result.filter(p => subArea(p, search.value) && (!search.area || mainArea(p, search.area)));
    else if (search.type === 'category') result = result.filter(p => categoryMatches(p, search.value));
    else if (search.type === 'keyword') {
      const keyword = normalizeSearch(search.value);
      const fields = ['custom_id','main_location','sub_location','district','subdistrict','province','zipcode','project_name','house_number','soi','highlights','category','badge','price'];
      result = result.filter(p => normalizeSearch(fields.map(key => p[key] || '').join(' ')).includes(keyword));
    }
  }
  if (listing.areas?.length) result = result.filter(p => listing.areas.some(area => mainArea(p, area)));
  if (listing.categories?.length) result = result.filter(p => listing.categories.some(category => categoryMatches(p, category)));
  const sort = listing.sort || (location ? 'price_asc' : 'latest');
  const price = p => Number(String(p.price || '').replace(/,/g, '')) || 0;
  if (sort === 'price_asc' || sort === 'price_desc') result.sort((a,b) => (price(a) - price(b)) * (sort === 'price_desc' ? -1 : 1));
  if (listing.near) result.sort((a, b) => Number(mainArea(b, listing.near)) - Number(mainArea(a, listing.near)));
  return result;
}
export const listingPage = (properties, page) => properties.slice((page - 1) * LISTING_PAGE_SIZE, page * LISTING_PAGE_SIZE);
