import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyEditorialSections, propertyFactSummary, propertyHighlightBlocks } from '../lib/propertyEditorial.js';
import { locationMarket } from '../lib/locationMarket.js';
import { locationFaq } from '../lib/locationFaq.js';
import { SEO_LOCATIONS } from '../lib/seoLocations.js';

test('editorial fields are optional and never infer renovation or nearby places', () => {
  assert.deepEqual(propertyEditorialSections({ status: 'available', images: ['house.jpg'] }), []);
  assert.deepEqual(propertyEditorialSections({ renovation_details: ' เปลี่ยนพื้นชั้นล่างแล้ว ', nearby_places: ' ', access_details: null }),
    [{ key: 'renovation_details', heading: 'งานรีโนเวทของบ้านหลังนี้', text: 'เปลี่ยนพื้นชั้นล่างแล้ว' }]);
  const summary = propertyFactSummary({ project_name: 'ทดสอบ', parking: 0, area_sqm: 'unknown', bedrooms: 3 });
  assert.equal(summary, 'ทดสอบ มี3 ห้องนอน');
  assert.equal(propertyFactSummary({}), '');
});

test('existing descriptions keep facts, order and bullets; only explicit headings become headings', () => {
  const blocks = propertyHighlightBlocks('จุดเด่น\r\n- ครัวหลังบ้าน\n- จอดรถ 1 คัน\n\nสถานที่ใกล้เคียง:\nตลาดตัวอย่าง\n👉จุดเด่น มีห้องนอนชั้นล่าง');
  assert.deepEqual(blocks, [{ type: 'heading', text: 'จุดเด่น' }, { type: 'list', items: ['ครัวหลังบ้าน', 'จอดรถ 1 คัน'] },
    { type: 'heading', text: 'สถานที่ใกล้เคียง' }, { type: 'text', text: 'ตลาดตัวอย่าง' }, { type: 'text', text: '👉จุดเด่น มีห้องนอนชั้นล่าง' }]);
});

test('market range excludes other locations, sold, unknown, invalid prices and duplicate IDs', () => {
  const location = SEO_LOCATIONS.find(item => item.name === 'คลองหลวง');
  const house = { id: 'a', inventoryState: 'available', main_location: 'คลองหลวง', price: '1,790,000' };
  const properties = [house, house, { ...house, id: 'b', price: 2790000 },
    { ...house, id: 'c', price: 100, inventoryState: 'sold' }, { ...house, id: 'd', price: 200, inventoryState: 'unknown' },
    { ...house, id: 'e', price: 300, main_location: 'ลำลูกกา' }, { ...house, id: 'f', price: 'Infinity' }];
  assert.deepEqual(locationMarket(location, properties), { count: 3, pricedCount: 2, min: 1790000, max: 2790000 });
  assert.match(locationFaq(location, properties)[0][1], /1,790,000 ถึง 2,790,000/);
  assert.deepEqual(locationMarket(location, []), { count: 0, pricedCount: 0, min: null, max: null });
  assert.doesNotMatch(locationFaq(location, [properties[3]])[0][1], /100 บาท|มี 0 หลัง/);
});
