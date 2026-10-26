import {
  fetchStockRows, fetchPartnerRows, selectAllActive, GROUP_ORDER, SHEET_URL, makeZoneComparator, zoneAreaTotals
} from '../../lib/stock';
import {
  loadWebsiteCoords, resolveMapUrls, locateHouses, fillFromSameProject, spreadOverlapping, average
} from '../../lib/geo';

const CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_MIN_INTERVAL_MS = 60 * 60 * 1000;
let cache = { at: 0, payload: null };
let lastLiveAt = 0;

const emptyCounts = () => GROUP_ORDER.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

const addCount = (counts, group) => {
  if (group in counts) counts[group] += 1;
};

async function buildPayload({ liveCoords = false } = {}) {
  const [rows, partners] = await Promise.all([fetchStockRows(), fetchPartnerRows()]);
  const active = selectAllActive(rows, partners.rows);

  const [lookupMapUrl, firestore] = await Promise.all([
    resolveMapUrls(active.map((row) => row.mapUrl)),
    loadWebsiteCoords({ live: liveCoords })
      .catch(() => ({ byHouse: new Map(), byProject: new Map(), source: 'none', builtAt: '' })),
  ]);

  const houses = fillFromSameProject(locateHouses(active, lookupMapUrl, firestore));

  // จัดกลุ่ม ทำเล -> โครงการ -> บ้าน
  const zoneMap = new Map();
  houses.forEach((house) => {
    const zoneName = house.zone || 'ไม่ระบุทำเล';
    if (!zoneMap.has(zoneName)) zoneMap.set(zoneName, new Map());
    const projectMap = zoneMap.get(zoneName);
    const projectName = house.project || 'ไม่ระบุโครงการ';
    if (!projectMap.has(projectName)) projectMap.set(projectName, []);
    projectMap.get(projectName).push(house);
  });

  const zones = [...zoneMap.entries()].map(([zoneName, projectMap]) => {
    const projects = [...projectMap.entries()].map(([projectName, projectHouses]) => {
      const coords = average(projectHouses.filter((h) => h.precision === 'exact').map((h) => h.coords))
        || average(projectHouses.map((h) => h.coords));
      return { name: projectName, coords, houses: projectHouses };
    });

    const zoneCoords = average(projects.map((p) => p.coords));
    return { name: zoneName, coords: zoneCoords, projects };
  });

  // เติมพิกัดโดยประมาณให้บ้านที่ยังไม่มีพิกัด (ใช้จุดกึ่งกลางโครงการ แล้วค่อยเป็นทำเล)
  zones.forEach((zone) => {
    zone.projects.forEach((project) => {
      project.houses.forEach((house) => {
        if (house.coords) return;
        if (project.coords) { house.coords = project.coords; house.precision = 'project'; return; }
        if (zone.coords) { house.coords = zone.coords; house.precision = 'zone'; }
      });
      if (!project.coords) project.coords = zone.coords || null;
    });
  });

  spreadOverlapping(houses);

  // สรุปยอดหลังจากพิกัดครบแล้ว
  zones.forEach((zone) => {
    zone.projects.forEach((project) => {
      project.counts = emptyCounts();
      project.houses.forEach((house) => addCount(project.counts, house.group));
      project.houseCount = project.houses.length;
      project.houses.sort((a, b) => a.houseNumber.localeCompare(b.houseNumber, 'th'));
    });
    zone.projects.sort((a, b) => b.houseCount - a.houseCount || a.name.localeCompare(b.name, 'th'));
    zone.counts = emptyCounts();
    zone.projects.forEach((project) => {
      GROUP_ORDER.forEach((key) => { zone.counts[key] += project.counts[key]; });
    });
    zone.projectCount = zone.projects.length;
    zone.houseCount = zone.projects.reduce((sum, project) => sum + project.houseCount, 0);
  });

  zones.sort(makeZoneComparator(zoneAreaTotals(zones)));

  const totals = emptyCounts();
  houses.forEach((house) => addCount(totals, house.group));

  return {
    updatedAt: new Date().toISOString(),
    sheetUrl: SHEET_URL,
    // พิกัดสำรองมาจากไหน: snapshot = ไฟล์ที่ build ไว้ (ไม่กินโควตา Firestore), firestore = อ่านสด
    coordsSource: firestore.source || 'none',
    coordsBuiltAt: firestore.builtAt || '',
    // ชีตพาร์ทเนอร์ที่อ่านไม่สำเร็จรอบนี้ (บ้านของเจ้านั้นจะหายไปจากแผนที่ชั่วคราว)
    partnerErrors: partners.errors,
    totals: {
      ...totals,
      houses: houses.length,
      projects: zones.reduce((sum, zone) => sum + zone.projectCount, 0),
      zones: zones.length,
      unlocated: houses.filter((house) => !house.coords).length,
      approximate: houses.filter((house) => house.coords && house.precision !== 'exact').length,
    },
    zones,
  };
}

export default async function handler(req, res) {
  const force = req.query.refresh === '1' || req.query.refresh === 'live';
  // refresh=live เท่านั้นที่จะไปอ่านพิกัดจาก Firestore สดๆ (ใช้ตอนเพิ่มบ้านใหม่ในเว็บหลักแล้วยังไม่ได้ deploy)
  // ใครก็เรียก URL นี้ได้ จึงจำกัดการอ่านทั้งคอลเลกชันไว้ชั่วโมงละครั้งต่อ instance กันโควตาอ่านรายวันหมด
  const liveCoords = req.query.refresh === 'live' && Date.now() - lastLiveAt >= LIVE_MIN_INTERVAL_MS;
  if (liveCoords) lastLiveAt = Date.now();
  const isFresh = cache.payload && Date.now() - cache.at < CACHE_TTL_MS;

  try {
    if (force || !isFresh) {
      cache = { at: Date.now(), payload: await buildPayload({ liveCoords }) };
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    res.status(200).json(cache.payload);
  } catch (error) {
    if (cache.payload) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ...cache.payload, stale: true, error: String(error.message || error) });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String(error.message || error) });
  }
}
