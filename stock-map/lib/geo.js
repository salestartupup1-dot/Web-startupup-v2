import geocache from '../data/geocache.json';
import websiteCoords from '../data/website-coords.json';
import { normalizeKey } from './stock';
import { extractCoords, inThailand } from './mapurl.mjs';
import { fetchFirestoreCoords } from './firestoreCoords.mjs';

export const MAP_CENTER = [13.99, 100.63];

const RESOLVE_CONCURRENCY = 6;

// ลิงก์ Google Maps ที่ resolve ตอน runtime จะถูกเก็บไว้ในหน่วยความจำของ instance
const runtimeCache = new Map();

export async function resolveMapUrls(urls) {
  const pending = urls.filter((url) => url && !geocache[url] && !runtimeCache.has(url));
  const unique = [...new Set(pending)];

  const worker = async (list) => {
    for (const url of list) {
      try {
        const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
        const coords = extractCoords(response.url) || extractCoords(await response.text());
        runtimeCache.set(url, coords);
      } catch {
        runtimeCache.set(url, null);
      }
    }
  };

  await Promise.all(
    Array.from({ length: RESOLVE_CONCURRENCY }, (_, i) => worker(unique.filter((_, j) => j % RESOLVE_CONCURRENCY === i)))
  );

  return (url) => geocache[url] || runtimeCache.get(url) || null;
}

const toCoordMaps = (data) => ({
  byHouse: new Map(Object.entries(data?.byHouse || {})),
  byProject: new Map(Object.entries(data?.byProject || {})),
});

// ถ้ายังไม่มีสแนปช็อต จะยอมอ่าน Firestore สดๆ แต่จำไว้ 6 ชม.
// เพื่อไม่ให้ instance ที่เพิ่งตื่นยิงอ่านซ้ำๆ จนกินโควตา
const LIVE_COORDS_TTL_MS = 6 * 60 * 60 * 1000;
let liveCoords = { at: 0, value: null };

/**
 * พิกัดสำรองจากเว็บหลัก — ปกติอ่านจากสแนปช็อต data/website-coords.json ที่สร้างตอน build
 * (`npm run build:coords`) จะได้ไม่ต้องอ่าน Firestore ทุกครั้งที่แคชของ /api/stock หมดอายุ
 * ซึ่งเป็นสาเหตุที่โควตาอ่านรายวันหมดเร็ว — อ่านทีนึงนับเป็น document read เท่าจำนวนบ้านทั้งเว็บ
 */
export async function loadWebsiteCoords({ live = false } = {}) {
  if (!live) {
    const snapshot = toCoordMaps(websiteCoords);
    if (snapshot.byHouse.size) {
      return { ...snapshot, source: 'snapshot', builtAt: websiteCoords?.builtAt || '' };
    }
    if (liveCoords.value && Date.now() - liveCoords.at < LIVE_COORDS_TTL_MS) return liveCoords.value;
  }

  const value = { ...toCoordMaps(await fetchFirestoreCoords()), source: 'firestore', builtAt: '' };
  liveCoords = { at: Date.now(), value };
  return value;
}

export const average = (points) => {
  const valid = points.filter((p) => p && inThailand(p[0], p[1]));
  if (!valid.length) return null;
  const lat = valid.reduce((sum, p) => sum + p[0], 0) / valid.length;
  const lng = valid.reduce((sum, p) => sum + p[1], 0) / valid.length;
  return [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
};

/**
 * หาพิกัดของบ้านแต่ละหลัง เรียงตามความแม่นยำ:
 *  exact   – ลิงก์ Google Maps ในชีต (คอลัมน์ Location)
 *  exact   – พิกัดของบ้านหลังเดียวกันในเว็บหลัก (จับคู่ด้วยบ้านเลขที่)
 *  project – ค่าเฉลี่ยพิกัดบ้านหลังอื่นในโครงการเดียวกันจากเว็บหลัก
 *  (ที่เหลือ) – ปล่อยว่างไว้ ให้ชั้นบนเติมด้วยจุดกึ่งกลางของโครงการ/ทำเล
 */
// ~2 กม. — ใช้ตรวจว่าพิกัดที่จับคู่ด้วยบ้านเลขที่อยู่ในโครงการเดียวกันจริง
const NEAR_DEG = 0.02;
const isNear = (a, b) => Math.abs(a[0] - b[0]) < NEAR_DEG && Math.abs(a[1] - b[1]) < NEAR_DEG;

export function locateHouses(houses, lookupMapUrl, firestore) {
  return houses.map((house) => {
    const fromSheet = house.mapUrl ? lookupMapUrl(house.mapUrl) : null;
    if (fromSheet) return { ...house, coords: fromSheet, precision: 'exact', source: 'sheet' };

    const projectPoints = firestore.byProject.get(normalizeKey(house.project)) || [];
    const fromHouse = firestore.byHouse.get(normalizeKey(house.houseNumber));
    // เว็บหลักเก็บพิกัดตามบ้านเลขที่อย่างเดียว บ้านพาร์ทเนอร์เลขซ้ำกับบ้านโครงการอื่นได้
    // จึงยอมรับเฉพาะเมื่อพิกัดนั้นอยู่ใกล้โครงการเดียวกันในเว็บหลัก
    const trusted = fromHouse && (house.owner === 'startup' || projectPoints.some((point) => isNear(point, fromHouse)));
    if (trusted) return { ...house, coords: fromHouse, precision: 'exact', source: 'website' };

    const fromProject = average(projectPoints);
    if (fromProject) return { ...house, coords: fromProject, precision: 'project', source: 'website' };

    return { ...house, coords: null, precision: 'unknown', source: null };
  });
}

/**
 * บ้านที่ยังไม่มีพิกัด ใช้จุดกึ่งกลางบ้านโครงการเดียวกันที่รู้พิกัดแน่นอนจากชีตอื่น
 * (เช่นบ้าน Naphat ที่ไม่มีลิงก์แผนที่ แต่โครงการเดียวกันมีบ้าน Startup Up อยู่)
 */
export function fillFromSameProject(houses) {
  const exact = new Map();
  houses.forEach((house) => {
    if (house.precision !== 'exact') return;
    const key = normalizeKey(house.project);
    if (!exact.has(key)) exact.set(key, []);
    exact.get(key).push(house.coords);
  });

  return houses.map((house) => {
    if (house.coords) return house;
    const coords = average(exact.get(normalizeKey(house.project)) || []);
    return coords ? { ...house, coords, precision: 'project', source: 'stock' } : house;
  });
}

// กระจายหมุดที่พิกัดซ้ำกันเป็นวงกลมเล็กๆ เพื่อไม่ให้ทับกันจนคลิกไม่ได้
export function spreadOverlapping(houses) {
  const buckets = new Map();
  houses.forEach((house) => {
    if (!house.coords) return;
    const key = `${house.coords[0].toFixed(5)},${house.coords[1].toFixed(5)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(house);
  });

  buckets.forEach((group) => {
    if (group.length < 2) return;
    // ~9 เมตร พอให้คลิกแยกกันได้ตอนซูมสุด แต่ยังเกาะอยู่กับตำแหน่งจริง
    const radius = 0.00008;
    group.forEach((house, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      house.coords = [
        Number((house.coords[0] + radius * Math.cos(angle)).toFixed(6)),
        Number((house.coords[1] + radius * Math.sin(angle)).toFixed(6)),
      ];
      house.spread = true;
    });
  });

  return houses;
}
