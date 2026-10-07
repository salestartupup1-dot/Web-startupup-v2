import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPropertyMapZones, propertyMapZone } from '../lib/propertyMap.js';

test('overview separates sub-areas and keeps identically named canals in different districts separate', () => {
  const houses = [
    { main_location: 'คลองหลวง', sub_location: 'คลองสอง', project_name: 'A', lat: 14, lng: 100.6 },
    { main_location: 'คลองหลวง', sub_location: 'คลองสอง', project_name: 'A', lat: 14.02, lng: 100.6 },
    { main_location: 'คลองหลวง', sub_location: 'คลองสอง', project_name: 'B', lat: 14.03, lng: 100.6 },
    { main_location: 'คลองหลวง', sub_location: 'คลองสาม', project_name: 'C', lat: 14, lng: 100.7 },
    { main_location: 'ลำลูกกา', sub_location: 'คลองสอง', project_name: 'D', lat: 13.9, lng: 100.6 },
    { main_location: 'คลองหลวง', sub_location: 'คลองสอง', project_name: 'Sold', badge: 'Sold Out', lat: 15, lng: 101 },
  ];
  const zones = groupPropertyMapZones(houses, p => p);
  assert.equal(zones.length, 3);
  assert.equal(zones[0].projects.length, 2);
  assert.equal(zones[0].items.length, 3);
  assert.ok(Math.abs(zones[0].lat - 14.02) < 1e-9, 'zone center weights projects equally');
  assert.notEqual(zones[0].key, zones[2].key);
  assert.deepEqual(groupPropertyMapZones([...houses].reverse(), p => p).find(z => z.key === zones[0].key).lat, zones[0].lat);
});

test('missing sub-area falls back to district; whitespace cannot split a zone', () => {
  assert.deepEqual(propertyMapZone({ main_location: ' คลองหลวง ', sub_location: ' คลองสอง ' }),
    propertyMapZone({ main_location: 'คลองหลวง', sub_location: 'คลองสอง' }));
  assert.equal(propertyMapZone({ district: 'ธัญบุรี' }).name, 'ธัญบุรี');
  assert.equal(propertyMapZone({}).name, 'พื้นที่อื่นๆ');
  assert.deepEqual(groupPropertyMapZones([], p => p), []);
});
