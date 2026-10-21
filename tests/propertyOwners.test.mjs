import test from 'node:test';
import assert from 'node:assert/strict';
import { PROPERTY_OWNERS, getPropertyOwner, selectPublicProperties } from '../lib/propertyOwners.js';
import { groupAdminStock } from '../lib/adminStock.js';

test('Notting remains selectable and saved houses stay in its own admin group', () => {
  const house = { id: 'notting-house', property_owner: 'Notting', project_name: 'Example' };
  const pending = { owner: 'Notting', houseNumber: '1/2', project: 'Example' };
  assert.ok(PROPERTY_OWNERS.includes('Notting'));
  assert.equal(getPropertyOwner(house), 'Notting');
  const groups = groupAdminStock([house], [pending]);
  assert.deepEqual(groups.find(group => group.owner === 'Notting').items, [house]);
  assert.deepEqual(groups.find(group => group.owner === 'Notting').pending, [pending]);
  assert.deepEqual(groups.find(group => group.owner === 'Startup Up').items, []);
  assert.ok(groupAdminStock([], []).some(group => group.owner === 'Notting'));
});

test('Notting is treated as a partner, not published in Startup Up public listings', () => {
  const company = { property_owner: 'Startup Up' };
  const partner = { property_owner: 'Notting' };
  assert.deepEqual(selectPublicProperties([company, partner]), [company]);
});
