import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ROUTE_STOPS, googleMapsRouteUrl, shortestOrder, planRoute, toggleRouteStop, moveRouteStop,
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

// ทุกจุดอยู่บนเส้นเดียวกัน (ลองจิจูดต่างกัน) ลำดับที่ดีที่สุดคือวิ่งทางเดียวไม่ย้อน
const onALine = (...lngs) => lngs.map((lng, i) => house(`h${lng}`, [14, lng]));
const noRoads = { fetchImpl: async () => { throw new Error('offline'); } };

test('the plan avoids the zig-zag that "nearest next" produces', async () => {
  // เริ่มที่ 100.00 บ้านอยู่ที่ +0.01, −0.02, +0.05 บนเส้นเดียวกัน
  // ไปหลังใกล้สุดทีละหลัง: +0.01 → −0.02 → +0.05 (ย้อนกลับข้ามจุดเริ่ม 2 รอบ)
  // ลำดับที่ดีที่สุด: −0.02 ก่อน แล้ววิ่งทางเดียว +0.01 → +0.05
  const stops = onALine(100.01, 99.98, 100.05);
  const plan = await planRoute(stops, [14, 100], noRoads);
  assert.deepEqual(plan.stops.map(s => s.uid), ['h99.98', 'h100.01', 'h100.05']);
});

test('shortest order respects a fixed start', () => {
  const cost = [[0, 2, 3, 6], [2, 0, 5, 8], [3, 5, 0, 3], [6, 8, 3, 0]];
  assert.deepEqual(shortestOrder(cost, { start: 0 }), { order: [0, 1, 2, 3], total: 10 });
});

test('without a known start, the best starting house is chosen', () => {
  const cost = [[0, 1, 9], [1, 0, 1], [9, 1, 0]];
  const { order, total } = shortestOrder(cost);
  assert.equal(total, 2);
  assert.equal(order[1], 1);
});

test('planning from the current location visits houses in one sweep, not back and forth', async () => {
  const stops = onALine(100.3, 100.1, 100.4, 100.2);
  const plan = await planRoute(stops, [14, 100], noRoads);
  assert.deepEqual(plan.stops.map(s => s.uid), ['h100.1', 'h100.2', 'h100.3', 'h100.4']);
  assert.equal(plan.road, false);
  assert.equal(plan.durationS, null);
});

test('road durations drive the order when the routing service answers', async () => {
  // บนแผนที่ B ใกล้กว่า แต่ถนนจริงไป A เร็วกว่า (เช่นมีคลองกั้น B)
  const stops = [house('A', [14, 100.2]), house('B', [14, 100.1])];
  const durations = [[0, 300, 900], [300, 0, 600], [900, 600, 0]];
  const fetchImpl = async (url) => {
    assert.equal(decodeURIComponent(url), '/api/road-costs?points=14,100;14,100.2;14,100.1');
    return { ok: true, json: async () => ({ code: 'Ok', durations, distances: durations.map(r => r.map(v => v * 10)) }) };
  };
  const plan = await planRoute(stops, [14, 100], { fetchImpl });
  assert.deepEqual(plan.stops.map(s => s.uid), ['A', 'B']);
  assert.equal(plan.road, true);
  assert.equal(plan.durationS, 900);
  assert.equal(plan.distanceM, 9000);
});

test('when two orders take the same time, the shorter distance wins', async () => {
  // ไป A ก่อนหรือ B ก่อนใช้เวลาเท่ากัน 20 นาที แต่ B ก่อนสั้นกว่า 5 กม.
  const stops = [house('A', [14, 100.2]), house('B', [14, 100.1])];
  const durations = [[0, 600, 600], [600, 0, 600], [600, 600, 0]];
  const distances = [[0, 10000, 5000], [10000, 0, 10000], [5000, 10000, 0]];
  const fetchImpl = async () => ({ ok: true, json: async () => ({ code: 'Ok', durations, distances }) });
  const plan = await planRoute(stops, [14, 100], { fetchImpl });
  assert.deepEqual(plan.stops.map(s => s.uid), ['B', 'A']);
});
