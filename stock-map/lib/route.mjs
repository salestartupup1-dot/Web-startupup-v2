/**
 * เส้นทางไปดูบ้านหลายหลัง — เปิดต่อใน Google Maps
 *
 * ลิงก์ Google Maps (api=1) รับจุดแวะได้สูงสุด 9 จุด + ปลายทาง 1 จุด
 * ไม่ใส่ origin เพื่อให้ Google Maps เริ่มจากตำแหน่งปัจจุบันของคนที่เปิดลิงก์
 */
export const MAX_ROUTE_STOPS = 10;

const point = (coords) => `${coords[0]},${coords[1]}`;

export function googleMapsRouteUrl(stops) {
  const located = stops.filter((stop) => stop.coords);
  if (!located.length) return '';
  const params = new URLSearchParams({ api: '1', travelmode: 'driving', destination: point(located.at(-1).coords) });
  if (located.length > 1) params.set('waypoints', located.slice(0, -1).map((stop) => point(stop.coords)).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

// ระยะเส้นตรง (เมตร) — ใช้เมื่อคำนวณระยะตามถนนไม่ได้
const distanceM = (a, b) => {
  const toRad = Math.PI / 180;
  const x = (b[1] - a[1]) * toRad * Math.cos(((a[0] + b[0]) / 2) * toRad);
  const y = (b[0] - a[0]) * toRad;
  return Math.sqrt(x * x + y * y) * 6371000;
};

export const straightLineCosts = (points) => points.map((a) => points.map((b) => distanceM(a, b)));

/**
 * หาลำดับที่ใช้ "ต้นทุน" รวมน้อยที่สุด (ไม่วนกลับจุดเริ่ม) โดยลองทุกลำดับแบบ Held-Karp
 * จุดไม่เกิน 11 จุด (ตำแหน่งปัจจุบัน + บ้าน 10 หลัง) คำนวณเสร็จในเสี้ยววินาที
 * ต่างจากการไป "หลังที่ใกล้ที่สุดถัดไป" ทีละหลัง ซึ่งมักเหลือหลังไกลๆ ให้ต้องย้อนกลับไปเก็บตอนท้าย
 */
export function shortestOrder(cost, { start = null } = {}) {
  const n = cost.length;
  if (n <= 1) return { order: n ? [0] : [], total: 0 };
  const full = (1 << n) - 1;
  const best = Array.from({ length: full + 1 }, () => new Float64Array(n).fill(Infinity));
  const prev = Array.from({ length: full + 1 }, () => new Int8Array(n).fill(-1));
  (start === null ? [...Array(n).keys()] : [start]).forEach((s) => { best[1 << s][s] = 0; });

  for (let mask = 1; mask <= full; mask += 1) {
    for (let last = 0; last < n; last += 1) {
      const sofar = best[mask][last];
      if (sofar === Infinity) continue;
      for (let next = 0; next < n; next += 1) {
        if (mask & (1 << next)) continue;
        const nextMask = mask | (1 << next);
        const total = sofar + cost[last][next];
        if (total < best[nextMask][next]) {
          best[nextMask][next] = total;
          prev[nextMask][next] = last;
        }
      }
    }
  }

  let end = 0;
  for (let i = 1; i < n; i += 1) if (best[full][i] < best[full][end]) end = i;
  const order = [];
  for (let mask = full, at = end; at !== -1;) {
    order.push(at);
    const before = prev[mask][at];
    mask &= ~(1 << at);
    at = before;
  }
  return { order: order.reverse(), total: best[full][end] };
}

/**
 * เวลา/ระยะขับรถตามถนนจริงระหว่างทุกคู่จุด ผ่าน /api/road-costs (บริการ OSRM, ข้อมูลถนน OpenStreetMap)
 * ใช้ไม่ได้ (เน็ตหลุด/บริการล่ม) คืน null ให้ผู้เรียกถอยไปใช้ระยะเส้นตรง
 */
export async function fetchRoadCosts(points, { fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  try {
    const query = points.map(([lat, lng]) => `${lat},${lng}`).join(';');
    const response = await fetchImpl(`/api/road-costs?points=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== 'Ok' || !Array.isArray(data.durations)) return null;
    // คู่ที่หาเส้นทางไม่ได้ (เช่นหมุดตกอยู่กลางทุ่ง) ประมาณจากเส้นตรงที่ความเร็วเฉลี่ย 30 กม./ชม.
    const fill = (matrix, fallback) => matrix.map((row, i) => row.map((value, j) => (
      Number.isFinite(value) ? value : fallback(points[i], points[j])
    )));
    return {
      durations: fill(data.durations, (a, b) => (distanceM(a, b) * 1.4) / (30 / 3.6)),
      distances: fill(data.distances || straightLineCosts(points), (a, b) => distanceM(a, b) * 1.4),
    };
  } catch {
    return null;
  }
}

/**
 * จัดลำดับบ้านในเส้นทางให้ใช้เวลาขับรวมน้อยที่สุด
 * origin = ตำแหน่งปัจจุบัน [lat, lng] (ถ้าไม่มี ให้ระบบเลือกจุดเริ่มที่ดีที่สุดเอง)
 * คืนลำดับใหม่ พร้อมระยะ/เวลารวม และบอกว่าคิดจากถนนจริงหรือเส้นตรง
 */
export async function planRoute(stops, origin = null, options = {}) {
  if (stops.length < 2 && !origin) return { stops, road: false, distanceM: 0, durationS: null };
  const points = [...(origin ? [origin] : []), ...stops.map((stop) => stop.coords)];
  const road = await fetchRoadCosts(points, options);
  // เวลาขับเป็นหลัก บวกระยะทางนิดหน่อย (1 กม. ≈ 20 วินาที) — ลำดับที่ใช้เวลาพอๆ กัน
  // จะได้เลือกเส้นที่สั้นกว่า ไม่วิ่งอ้อมไกลเพื่อประหยัดเวลาไม่กี่วินาที
  const cost = road
    ? road.durations.map((row, i) => row.map((seconds, j) => seconds + road.distances[i][j] / 50))
    : straightLineCosts(points);
  const { order } = shortestOrder(cost, { start: origin ? 0 : null });

  let distance = 0;
  let duration = 0;
  for (let i = 1; i < order.length; i += 1) {
    const [from, to] = [order[i - 1], order[i]];
    distance += road ? road.distances[from][to] : cost[from][to];
    if (road) duration += road.durations[from][to];
  }
  const offset = origin ? 1 : 0;
  return {
    stops: order.filter((index) => index >= offset).map((index) => stops[index - offset]),
    road: !!road,
    distanceM: distance,
    durationS: road ? duration : null,
  };
}

// เก็บเฉพาะข้อมูลที่ต้องใช้วาดรายการและเปิดเส้นทาง จะได้ไม่ผูกกับโครงสร้างข้อมูลบ้านทั้งก้อน
export const toRouteStop = (house) => ({
  uid: house.uid,
  project: house.project,
  houseNumber: house.houseNumber,
  zone: house.zone,
  owner: house.owner,
  coords: house.coords,
  precision: house.precision,
});

export function toggleRouteStop(stops, house) {
  if (stops.some((stop) => stop.uid === house.uid)) return stops.filter((stop) => stop.uid !== house.uid);
  if (!house.coords || stops.length >= MAX_ROUTE_STOPS) return stops;
  return [...stops, toRouteStop(house)];
}

export function moveRouteStop(stops, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= stops.length) return stops;
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
