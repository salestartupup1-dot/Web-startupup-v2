import test from 'node:test';
import assert from 'node:assert/strict';
import { stockRowFocus } from '../lib/masterStock.js';
import { withWebsiteInventory, stockBadge } from '../lib/websiteInventory.js';

const cells = values => name => values[name] ?? '';

test('Focus follows the All in One formula: ticked, or 180+ days in stock with 190 or fewer days left', () => {
  const rule = { focusRule: true };
  assert.equal(stockRowFocus(cells({ Focus: 'TRUE' }), rule), true);
  assert.equal(stockRowFocus(cells({ Focus: 'FALSE', 'จำนวนวันของบ้าน': '180', 'เหลือเวลา': '190' }), rule), true);
  assert.equal(stockRowFocus(cells({ 'จำนวนวันของบ้าน': '1,219', 'เหลือเวลา': '-5' }), rule), true);
  assert.equal(stockRowFocus(cells({ 'จำนวนวันของบ้าน': '179', 'เหลือเวลา': '30' }), rule), false);
  assert.equal(stockRowFocus(cells({ 'จำนวนวันของบ้าน': '400', 'เหลือเวลา': '191' }), rule), false);
  assert.equal(stockRowFocus(cells({ 'จำนวนวันของบ้าน': '400', 'เหลือเวลา': 'ฝากขาย' }), rule), false, 'both counters must be numbers');
  assert.equal(stockRowFocus(cells({ Focus: 'TRUE' }), {}), null, 'tabs without the Focus rule are unknown');
  assert.equal(stockRowFocus(cells({}), { status: 'เร่งขาย' }), true, 'a เร่งขาย status counts in any tab');
});

const property = { id: 'one', house_number: '1/2', project_name: 'ทดสอบ', property_owner: 'Startup Up' };
const stock = (focus, status = 'ว่าง') => ({ coveredOwners: ['Startup Up'], rows: [{ key: '1/2', project: 'ทดสอบ', owner: 'Startup Up', status, sold: status === 'ขายแล้ว', focus }] });

test('Master Stock decides the Promotion badge for houses it knows', () => {
  assert.equal(withWebsiteInventory(property, stock(true)).badge, 'Promotion');
  assert.equal(withWebsiteInventory({ ...property, badge: 'New' }, stock(true)).badge, 'Promotion', 'Focus replaces New');
  assert.equal(withWebsiteInventory({ ...property, badge: 'Promotion' }, stock(false)).badge, '', 'unticking removes it');
  assert.equal(withWebsiteInventory({ ...property, badge: 'New' }, stock(false)).badge, 'New');
  assert.equal(withWebsiteInventory(property, stock(true, 'ยื่นกู้')).badge, 'Promotion', 'houses with a customer in progress keep it');
});

test('sold houses, missing stock and tabs without Focus keep the back-office badge', () => {
  assert.equal(withWebsiteInventory({ ...property, badge: 'Sold Out' }, stock(true)).badge, 'Sold Out');
  assert.equal(withWebsiteInventory({ ...property, badge: 'Promotion' }, stock(true, 'ขายแล้ว')).badge, 'Promotion');
  assert.equal(withWebsiteInventory({ ...property, badge: 'Promotion' }, null).badge, 'Promotion', 'a sheet outage never strips promotions');
  assert.equal(withWebsiteInventory({ ...property, badge: 'Promotion' }, stock(null)).badge, 'Promotion');
  assert.equal(withWebsiteInventory({ ...property, badge: 'Promotion' }, stock(undefined)).badge, 'Promotion', 'older cached stock has no focus field');
  assert.equal(stockBadge('New', 'available', [{ focus: false }, { focus: true }]), 'Promotion');
});
