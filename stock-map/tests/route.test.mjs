import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ROUTE_STOPS, googleMapsRouteUrl, orderByNearest, toggleRouteStop, moveRouteStop,
} from '../lib/route.mjs';

const house = (uid, coords) => ({ uid, project: 'P', houseNumber: uid, owner: 'startup', coords, precision: 'exact' });

test('route link ends at the last stop, earlier stops become waypoints, origin is left to current location', () => {
  const url = new URL(googleMapsRouteUrl([house('a', [14, 100.1]), house('b', [14.1, 100.2]), house('c', [14.2, 100.3])]));
  assert.equal(url.origin + url.pathname, 'https://www.google.com/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('destination'), '14.2,100.3');
  assert.equal(url.searchParams.get('waypoints'), '14,100.1|14.1,100.2');
  assert.equal(url.searchParams.has('origin'), false);
});

test('single stop has no waypoints; empty route has no link', () => {
  const url = new URL(googleMapsRouteUrl([house('a', [14, 100])]));
  assert.equal(url.searchParams.has('waypoints'), false);
  assert.equal(googleMapsRouteUrl([]), '');
});

test('toggle adds, removes, refuses houses without coordinates and caps at the Google Maps limit', () => {
  let stops = toggleRouteStop([], house('a', [14, 100]));
  assert.deepEqual(stops.map(s => s.uid), ['a']);
  assert.deepEqual(toggleRouteStop(stops, house('a', [14, 100])), []);
  assert.equal(toggleRouteStop(stops, house('x', null)), stops);
  stops = Array.from({ length: MAX_ROUTE_STOPS }, (_, i) => house(`h${i}`, [14, 100 + i / 100]));
  assert.equal(toggleRouteStop(stops, house('extra', [14, 100])).length, MAX_ROUTE_STOPS);
});

test('move swaps neighbours and ignores moves past either end', () => {
  const stops = [house('a', [14, 100]), house('b', [14, 100]), house('c', [14, 100])];
  assert.deepEqual(moveRouteStop(stops, 2, -1).map(s => s.uid), ['a', 'c', 'b']);
  assert.equal(moveRouteStop(stops, 0, -1), stops);
  assert.equal(moveRouteStop(stops, 2, 1), stops);
});

test('nearest ordering keeps the first stop and then always visits the closest remaining stop', () => {
  const stops = [house('start', [14, 100]), house('far', [14, 100.3]), house('near', [14, 100.01]), house('mid', [14, 100.1])];
  assert.deepEqual(orderByNearest(stops).map(s => s.uid), ['start', 'near', 'mid', 'far']);
});
