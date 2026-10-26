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

// ระยะโดยประมาณ (กม.) — พอสำหรับเทียบว่าจุดไหนใกล้กว่า ไม่ต้องแม่นระดับเมตร
const distanceKm = (a, b) => {
  const toRad = Math.PI / 180;
  const x = (b[1] - a[1]) * toRad * Math.cos(((a[0] + b[0]) / 2) * toRad);
  const y = (b[0] - a[0]) * toRad;
  return Math.sqrt(x * x + y * y) * 6371;
};

/** จัดลำดับให้วิ่งน้อยลง: คงจุดแรกไว้ แล้วไปจุดที่ใกล้ที่สุดถัดไปเรื่อยๆ */
export function orderByNearest(stops) {
  if (stops.length < 3) return stops;
  const [first, ...rest] = stops;
  const ordered = [first];
  const remaining = [...rest];
  while (remaining.length) {
    const from = ordered.at(-1).coords;
    let best = 0;
    remaining.forEach((stop, i) => {
      if (distanceKm(from, stop.coords) < distanceKm(from, remaining[best].coords)) best = i;
    });
    ordered.push(remaining.splice(best, 1)[0]);
  }
  return ordered;
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
