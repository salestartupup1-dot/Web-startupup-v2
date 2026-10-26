import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { HighlightAccount } from '../components/HighlightAuth';
import HighlightsSummary from '../components/HighlightsSummary';
import RoutePlanner from '../components/RoutePlanner';
import { highlightKey } from '../lib/highlights.mjs';
import { statusOptions, matchesStatus, toggleStatus, isStatusGroup } from '../lib/statusFilters.mjs';
import { MAX_ROUTE_STOPS, toRouteStop, toggleRouteStop } from '../lib/route.mjs';
import {
  Home, MapPin, Hammer, CheckCircle, Users, RefreshCw, ChevronRight, ChevronDown,
  Search, AlertTriangle, Layers, ArrowLeft, ExternalLink, Plus
} from 'lucide-react';
import {
  GROUP_META, GROUP_ORDER, OWNER_META, OWNER_ORDER, SIZE_BUCKETS, STYLE_LABELS, STYLE_ORDER, parseZoneName
} from '../lib/stock';

const StockMap = dynamic(() => import('../components/StockMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[420px] lg:h-[520px] grid place-items-center text-gray-400 text-sm">กำลังโหลดแผนที่...</div>,
});

const GROUP_ICONS = { wip: Hammer, ready: CheckCircle, hold: Users };

const formatPrice = (price) => (price ? `฿${price.toLocaleString('th-TH')}` : '—');

const formatUpdated = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const normalize = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, '');

// จำตัวเลือกเจ้าของและเส้นทางไว้ในเครื่อง — เปิดหน้าใหม่แล้วยังอยู่ (โหมดส่วนตัวอาจใช้ไม่ได้ ก็แค่ไม่จำ)
const STORAGE_KEYS = { hiddenOwners: 'stockmap.hiddenOwners.v1', route: 'stockmap.route.v1' };
const readStored = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
};
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ไม่จำก็ได้ */ }
};
const isStop = (stop) => stop && typeof stop.uid === 'string' && Array.isArray(stop.coords) && stop.coords.length === 2;
const stopIdentity = (house) => `${house.owner}|${normalize(house.project)}|${normalize(house.houseNumber)}`;

function StatCard({ icon: Icon, label, value, sub, color, active, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={`text-left bg-white rounded-2xl border p-4 transition ${onClick ? 'hover:shadow-md cursor-pointer' : ''} ${active ? 'border-2 shadow-md' : 'border-gray-200'}`}
      style={active ? { borderColor: color } : undefined}
    >
      <div className="flex items-center gap-2 text-[13px] text-gray-500">
        <Icon size={16} style={{ color }} />
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[12px] text-gray-400 mt-0.5">{sub}</div>}
    </Tag>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-[12px] rounded-full px-3 py-1.5 border transition ${
        active
          ? 'bg-brand-green text-white border-brand-green'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-green hover:text-brand-green'
      }`}
    >
      {children}
    </button>
  );
}

// เซลล์ในตารางสรุป — กดแล้วไปตั้งตัวกรอง ช่องที่เป็น 0 กดไม่ได้
function MatrixCell({ value, active, onClick }) {
  if (!value) return <td className="px-2 py-1.5 text-center text-gray-200">–</td>;
  return (
    <td className="px-1 py-1">
      <button
        onClick={onClick}
        className={`w-full rounded-md px-2 py-1 text-[13px] font-medium transition ${
          active ? 'bg-brand-green text-white' : 'text-gray-700 hover:bg-brand-light'
        }`}
      >
        {value}
      </button>
    </td>
  );
}

function HouseRow({ house, active, onClick, routeNo, routeFull, onToggleRoute }) {
  const meta = GROUP_META[house.group];
  const owner = house.owner !== 'startup' ? OWNER_META[house.owner] : null;
  const canAdd = house.coords && (routeNo || !routeFull);
  return (
    <div className={`rounded-lg border transition flex items-stretch ${active ? 'bg-brand-light border-brand-green' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
      <button onClick={onClick} className="min-w-0 flex-1 text-left px-3 py-2 flex items-start gap-2">
        <span className="mt-1.5 w-2 h-2 rounded-full flex-none" style={{ background: meta.color }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-gray-800 truncate">
            บ้านเลขที่ {house.houseNumber || '—'}
            {owner && <span className="ml-1.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5 text-white align-middle" style={{ background: owner.color }}>{owner.label}</span>}
          </span>
          <span className="block text-[11px] text-gray-500 truncate">
            {house.rawStatus} · {formatPrice(house.price)}
            {house.style ? ` · ${house.style}` : ''}
            {house.area ? ` · ${house.area}` : ''}
          </span>
        </span>
        {house.precision !== 'exact' && (
          <AlertTriangle size={13} className="text-amber-500 mt-1 flex-none" title="ตำแหน่งโดยประมาณ" />
        )}
      </button>
      <button
        type="button"
        onClick={onToggleRoute}
        disabled={!canAdd}
        aria-label={routeNo ? `จุดที่ ${routeNo} ในเส้นทาง กดเพื่อเอาออก` : 'เพิ่มในเส้นทาง'}
        title={!house.coords ? 'ยังไม่มีพิกัด' : routeNo ? 'เอาออกจากเส้นทาง' : routeFull ? `เส้นทางครบ ${MAX_ROUTE_STOPS} จุดแล้ว` : 'เพิ่มในเส้นทาง'}
        className="w-11 flex-none grid place-items-center border-l border-gray-100 text-brand-green disabled:text-gray-300"
      >
        {routeNo
          ? <span className="w-6 h-6 rounded-full bg-brand-green text-white text-[12px] font-bold grid place-items-center">{routeNo}</span>
          : <Plus size={17} />}
      </button>
    </div>
  );
}

const PAGE_TITLE = 'แผนที่สต๊อกบ้าน Startup Up';
const PAGE_DESC = 'ดูว่าแต่ละทำเลมีกี่โครงการ โครงการมีกี่หลัง และบ้านที่ยังไม่เสร็จอยู่ตรงไหน';

/**
 * og:image ต้องเป็น URL เต็ม เพราะตัวอ่านพรีวิว (LINE, Facebook, Messenger) ไม่รู้จัก path สั้น
 *
 * อ่านโดเมนจาก request ตอนเสิร์ฟ ไม่ใช่ตอน build — เวลาผูกโดเมนใหม่หรือเปิดผ่าน URL อื่น
 * ลิงก์รูปจะถูกเสมอโดยไม่ต้อง build ใหม่
 */
export function getServerSideProps({ req }) {
  const first = (value) => String(value || '').split(',')[0].trim();
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  const proto = first(req.headers['x-forwarded-proto']) || (host.startsWith('localhost') ? 'http' : 'https');

  return { props: { siteUrl: host ? `${proto}://${host}` : '' } };
}

export default function StockMapPage({ siteUrl = '' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [styleFilter, setStyleFilter] = useState(null);
  const [sizeFilter, setSizeFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState({ zone: null, project: null });
  const [activeHouseKey, setActiveHouseKey] = useState(null);
  const [openZones, setOpenZones] = useState({});
  const [highlightUpdates, setHighlightUpdates] = useState({});
  const [hiddenOwners, setHiddenOwners] = useState([]);
  const [route, setRoute] = useState([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const mapSection = useRef(null);
  const handleHighlightStatus = useCallback((house, hasHighlights) => {
    const key = highlightKey(house);
    setHighlightUpdates(previous => ({ ...previous, [key]: { value: hasHighlights, at: Date.now() } }));
  }, []);
  // พาไปที่บ้านหลังหนึ่งบนแผนที่ — ล้างตัวกรองที่อาจซ่อนบ้านหลังนั้นอยู่ก่อน
  const focusHouse = useCallback(house => {
    const zone = house.zone || 'ไม่ระบุทำเล';
    setSearch(''); setStatusFilter(null); setStyleFilter(null); setSizeFilter(null);
    setHiddenOwners(previous => previous.filter(owner => owner !== house.owner));
    setView({ zone, project: house.project || 'ไม่ระบุโครงการ' });
    setOpenZones(previous => ({ ...previous, [zone]: true }));
    setActiveHouseKey(house.uid);
    mapSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const toggleRoute = useCallback(house => setRoute(previous => toggleRouteStop(previous, house)), []);
  const toggleOwner = owner => setHiddenOwners(previous => (
    previous.includes(owner) ? previous.filter(key => key !== owner) : [...previous, owner]
  ));

  useEffect(() => {
    const owners = readStored(STORAGE_KEYS.hiddenOwners);
    const stops = readStored(STORAGE_KEYS.route);
    if (Array.isArray(owners)) setHiddenOwners(owners.filter(key => OWNER_META[key]));
    if (Array.isArray(stops)) setRoute(stops.filter(isStop).slice(0, MAX_ROUTE_STOPS));
    setStorageLoaded(true);
  }, []);
  useEffect(() => { if (storageLoaded) writeStored(STORAGE_KEYS.hiddenOwners, hiddenOwners); }, [storageLoaded, hiddenOwners]);
  useEffect(() => { if (storageLoaded) writeStored(STORAGE_KEYS.route, route); }, [storageLoaded, route]);

  const load = useCallback(async (force) => {
    if (force) setRefreshing(true);
    try {
      const response = await fetch(`/api/stock${force ? '?refresh=1' : ''}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'โหลดข้อมูลไม่สำเร็จ');
      setData(payload);
      setError(payload.stale ? `ใช้ข้อมูลชุดล่าสุดที่แคชไว้ (${payload.error})` : '');
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  // เส้นทางที่จำไว้จากครั้งก่อน: อัปเดตพิกัด/ลำดับแถวให้ตรงข้อมูลล่าสุด (แถวในชีตเลื่อนได้)
  useEffect(() => {
    if (!data || !storageLoaded) return;
    const latest = new Map();
    data.zones.forEach(zone => zone.projects.forEach(project => project.houses.forEach(house => {
      if (house.coords) latest.set(stopIdentity(house), house);
    })));
    setRoute(previous => previous.map(stop => {
      const house = latest.get(stopIdentity(stop));
      return house ? toRouteStop(house) : stop;
    }));
  }, [data, storageLoaded]);

  const ownerCounts = useMemo(() => {
    const counts = Object.fromEntries(OWNER_ORDER.map(key => [key, 0]));
    data?.zones.forEach(zone => zone.projects.forEach(project => project.houses.forEach(house => {
      counts[house.owner] = (counts[house.owner] || 0) + 1;
    })));
    return counts;
  }, [data]);
  const owners = OWNER_ORDER.filter(key => ownerCounts[key] > 0);

  // ตัดบ้านของเจ้าที่ไม่ได้ติ๊กออกก่อน แล้วตัวกรอง/ยอดสรุปทั้งหมดคิดจากชุดนี้
  const ownerData = useMemo(() => {
    if (!data || !hiddenOwners.length) return data;
    const hidden = new Set(hiddenOwners);
    const zones = data.zones
      .map(zone => ({
        ...zone,
        projects: zone.projects
          .map(project => ({ ...project, houses: project.houses.filter(house => !hidden.has(house.owner)) }))
          .filter(project => project.houses.length),
      }))
      .filter(zone => zone.projects.length);
    return { ...data, zones };
  }, [data, hiddenOwners]);

  const statuses = useMemo(() => statusOptions(ownerData?.zones), [ownerData]);
  const changeStatusFilter = next => {
    setStatusFilter(next);
    setActiveHouseKey(null);
  };

  // กรองตามสถานะและคำค้น แล้วคำนวณยอดใหม่ให้ตรงกับสิ่งที่เห็นบนแผนที่
  const zones = useMemo(() => {
    if (!ownerData) return [];
    const term = normalize(search);

    return ownerData.zones
      .map((zone) => {
        const projects = zone.projects
          .map((project) => {
            const matchesText = !term
              || normalize(project.name).includes(term)
              || normalize(zone.name).includes(term);
            const houses = project.houses.filter((house) => {
              if (!matchesStatus(house, statusFilter)) return false;
              if (styleFilter && house.styleCategory !== styleFilter) return false;
              if (sizeFilter && house.sizeBucket !== sizeFilter) return false;
              if (!term) return true;
              return matchesText || normalize(house.houseNumber).includes(term);
            });
            if (!houses.length) return null;
            const counts = GROUP_ORDER.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
            houses.forEach((house) => { counts[house.group] += 1; });
            return { ...project, houses, houseCount: houses.length, counts };
          })
          .filter(Boolean);

        if (!projects.length) return null;
        const counts = GROUP_ORDER.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
        projects.forEach((project) => GROUP_ORDER.forEach((key) => { counts[key] += project.counts[key]; }));
        return {
          ...zone,
          projects,
          counts,
          projectCount: projects.length,
          houseCount: projects.reduce((sum, project) => sum + project.houseCount, 0),
        };
      })
      .filter(Boolean);
  }, [ownerData, statusFilter, styleFilter, sizeFilter, search]);

  const visible = useMemo(() => {
    const totals = GROUP_ORDER.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    let houses = 0;
    let projects = 0;
    let approximate = 0;
    zones.forEach((zone) => {
      projects += zone.projectCount;
      zone.projects.forEach((project) => project.houses.forEach((house) => {
        houses += 1;
        totals[house.group] += 1;
        if (house.coords && house.precision !== 'exact') approximate += 1;
      }));
    });
    return { totals, houses, projects, zonesCount: zones.length, approximate };
  }, [zones]);

  // ตารางสรุปอิงสถานะ+คำค้นเท่านั้น ไม่อิงตัวกรองประเภท/ขนาด ไม่งั้นพอกดเซลล์แล้วตารางจะยุบเหลือช่องเดียว
  const summary = useMemo(() => {
    if (!ownerData) return null;
    const term = normalize(search);
    const houses = [];
    ownerData.zones.forEach((zone) => zone.projects.forEach((project) => project.houses.forEach((house) => {
      if (!matchesStatus(house, statusFilter)) return;
      if (term
        && !normalize(project.name).includes(term)
        && !normalize(zone.name).includes(term)
        && !normalize(house.houseNumber).includes(term)) return;
      houses.push({ ...house, zoneName: zone.name });
    })));

    const styles = STYLE_ORDER.filter((key) => houses.some((h) => h.styleCategory === key));
    const sizes = SIZE_BUCKETS.filter((b) => houses.some((h) => h.sizeBucket === b.key));
    const zoneNames = [...new Set(houses.map((h) => h.zoneName))];

    const count = (predicate) => houses.filter(predicate).length;

    return {
      total: houses.length,
      styles,
      sizes,
      noSize: count((h) => !h.sizeBucket),
      styleTotals: Object.fromEntries(styles.map((s) => [s, count((h) => h.styleCategory === s)])),
      sizeTotals: Object.fromEntries(sizes.map((b) => [b.key, count((h) => h.sizeBucket === b.key)])),
      byStyleSize: Object.fromEntries(styles.map((s) => [s, {
        ...Object.fromEntries(sizes.map((b) => [b.key, count((h) => h.styleCategory === s && h.sizeBucket === b.key)])),
        none: count((h) => h.styleCategory === s && !h.sizeBucket),
      }])),
      // ไม่เรียงใหม่ — zoneNames ไล่ตามลำดับที่ API จัดกลุ่มย่านมาให้แล้ว จะได้ตรงกับรายการด้านข้าง
      zones: zoneNames.map((name) => ({
        name,
        total: count((h) => h.zoneName === name),
        byStyle: Object.fromEntries(styles.map((s) => [s, count((h) => h.zoneName === name && h.styleCategory === s)])),
      })),
    };
  }, [ownerData, statusFilter, search]);

  const handleViewChange = useCallback((next) => {
    setView(next);
    setActiveHouseKey(null);
    if (next.zone) setOpenZones((prev) => ({ ...prev, [next.zone]: true }));
  }, []);

  // ถ้าทำเล/โครงการที่เลือกอยู่หายไปหลังกรอง ให้ถอยกลับไปมุมมองที่ยังมีข้อมูล
  useEffect(() => {
    if (!view.zone) return;
    const zone = zones.find((z) => z.name === view.zone);
    if (!zone) { setView({ zone: null, project: null }); return; }
    if (view.project && !zone.projects.some((p) => p.name === view.project)) {
      setView({ zone: view.zone, project: null });
    }
  }, [zones, view]);

  // จับทำเลย่านเดียวกันมาไว้เป็นก้อนเดียว (API เรียงมาให้ติดกันแล้ว) ย่านที่มีทำเลเดียวไม่ต้องมีหัวข้อ
  const zoneGroups = useMemo(() => {
    const groups = [];
    zones.forEach((zone) => {
      const { area, label } = parseZoneName(zone.name);
      const last = groups[groups.length - 1];
      const entry = { zone, shortLabel: label };
      if (last && last.area === area) {
        last.zones.push(entry);
        last.total += zone.houseCount;
      } else {
        groups.push({ area, zones: [entry], total: zone.houseCount });
      }
    });
    return groups;
  }, [zones]);

  const activeZone = view.zone ? zones.find((zone) => zone.name === view.zone) : null;
  const activeProject = activeZone && view.project
    ? activeZone.projects.find((project) => project.name === view.project)
    : null;

  const unlocated = useMemo(() => {
    const list = [];
    zones.forEach((zone) => zone.projects.forEach((project) => project.houses.forEach((house) => {
      if (!house.coords) list.push(house);
    })));
    return list;
  }, [zones]);

  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={PAGE_DESC} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Startup Up Real Estate" />
        <meta property="og:locale" content="th_TH" />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESC} />
        <meta property="og:image" content={`${siteUrl}/og.png`} />
        <meta property="og:image:secure_url" content={`${siteUrl}/og.png`} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={PAGE_TITLE} />
        {siteUrl && <meta property="og:url" content={siteUrl} />}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESC} />
        <meta name="twitter:image" content={`${siteUrl}/og.png`} />
      </Head>

      <div className="min-h-screen bg-[#f7f8f7] text-gray-900">
        <header className="bg-brand-green text-white">
          <div className="max-w-[1500px] mx-auto px-4 py-5 flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-white.png"
                alt="Startup Up Real Estate"
                width={900}
                height={526}
                className="h-11 md:h-14 w-auto flex-none"
              />
              <span className="h-10 w-px bg-white/20 hidden sm:block" />
              <div>
                <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                  <MapPin size={20} className="flex-none" /> แผนที่สต๊อกบ้าน
                </h1>
                <p className="text-white/70 text-[12px] md:text-[13px] mt-1">
                  ข้อมูลจาก Master Stock รวมบ้านพาร์ทเนอร์ · กดบ้านเพื่อจัดเส้นทางไปดูบ้านใน Google Maps
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HighlightAccount />
              {data && (
                <span className="text-white/60 text-[12px] hidden sm:block">
                  อัปเดต {formatUpdated(data.updatedAt)}
                </span>
              )}
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full px-4 py-2 text-[13px] flex items-center gap-2 transition"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                ดึงข้อมูลใหม่
              </button>
            </div>
          </div>
        </header>

        <main className={`max-w-[1500px] mx-auto px-4 pt-5 ${route.length ? 'pb-[28rem]' : 'pb-5'}`}>
          {error && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-[13px] flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-none" /> {error}
            </div>
          )}
          {data?.partnerErrors?.length > 0 && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-[13px] flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-none" />
              <span>โหลดสต๊อกพาร์ทเนอร์บางเจ้าไม่สำเร็จ บ้านของเจ้านั้นจะยังไม่ขึ้นบนแผนที่ — กด “ดึงข้อมูลใหม่” อีกครั้ง ({data.partnerErrors.join(' · ')})</span>
            </div>
          )}

          {loading ? (
            <div className="h-[60vh] grid place-items-center text-gray-400">กำลังโหลดข้อมูลจาก Master Stock...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard
                  icon={Home}
                  label="บ้านทั้งหมด"
                  value={visible.houses}
                  sub={`${visible.projects} โครงการ · ${visible.zonesCount} ทำเล`}
                  color="#0b3d1b"
                  active={statusFilter === null}
                  onClick={() => changeStatusFilter(null)}
                />
                {GROUP_ORDER.map((key) => {
                  const meta = GROUP_META[key];
                  const Icon = GROUP_ICONS[key];
                  return (
                    <StatCard
                      key={key}
                      icon={Icon}
                      label={meta.label}
                      value={visible.totals[key]}
                      sub={meta.desc}
                      color={meta.color}
                      active={isStatusGroup(statusFilter, key, statuses)}
                      onClick={() => changeStatusFilter(isStatusGroup(statusFilter, key, statuses) ? null : statuses.filter(option => option.group === key).map(option => option.key))}
                    />
                  );
                })}
                <StatCard
                  icon={AlertTriangle}
                  label="ตำแหน่งโดยประมาณ"
                  value={visible.approximate}
                  sub={`อ้างอิงจุดกึ่งกลางโครงการ/ทำเล${unlocated.length ? ` · ไม่มีพิกัดเลย ${unlocated.length} หลัง` : ''}`}
                  color="#b45309"
                />
              </div>

              <fieldset className="mt-4 bg-white rounded-2xl border border-gray-200 px-4 pb-4">
                <legend className="px-2 text-sm font-semibold text-brand-green">แสดงบ้านของ</legend>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 mb-3 text-[12px]">
                  <span className="text-gray-500">ติ๊กเลือกได้ว่าจะให้บ้านของใครขึ้นบนแผนที่</span>
                  <button type="button" onClick={() => setHiddenOwners([])} className="text-brand-green underline min-h-10">แสดงทุกเจ้า</button>
                  <button type="button" onClick={() => setHiddenOwners(owners.filter(key => key !== 'startup'))} className="text-gray-600 underline min-h-10">เฉพาะ Startup Up</button>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {owners.map(key => {
                    const meta = OWNER_META[key];
                    const checked = !hiddenOwners.includes(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-xl border cursor-pointer text-[13px] ${checked ? 'font-medium' : 'border-gray-200 text-gray-400'}`}
                        style={checked ? { borderColor: meta.color, color: meta.color, background: `${meta.color}12` } : undefined}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleOwner(key)} className="w-4 h-4 shrink-0" style={{ accentColor: meta.color }} />
                        <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: meta.color, opacity: checked ? 1 : 0.4 }} />
                        <span>{meta.label}</span>
                        <span className="ml-auto text-[12px]" aria-label={`${ownerCounts[key]} หลัง`}>{ownerCounts[key]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-4 bg-white rounded-2xl border border-gray-200 px-4 pb-4">
                <legend className="px-2 text-sm font-semibold text-brand-green">กรองสถานะบ้าน</legend>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 mb-3 text-[12px]">
                  <span className="text-gray-500">ติ๊กเลือกได้หลายสถานะพร้อมกัน</span>
                  <button type="button" onClick={() => changeStatusFilter(null)} className="text-brand-green underline min-h-10">เลือกทั้งหมด</button>
                  <button type="button" onClick={() => changeStatusFilter([])} className="text-gray-600 underline min-h-10">ล้างที่เลือก</button>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {statuses.map(option => {
                    const checked = statusFilter === null || statusFilter.includes(option.key);
                    return (
                      <label key={option.key} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-xl border cursor-pointer text-[13px] ${checked ? 'border-brand-green bg-brand-light text-brand-green' : 'border-gray-200 text-gray-600'}`}>
                        <input type="checkbox" checked={checked} onChange={() => changeStatusFilter(toggleStatus(statusFilter, option.key, statuses))} className="w-4 h-4 shrink-0 accent-[#0b3d1b]" />
                        <span>{option.key}</span>
                        <span className="ml-auto text-[12px]" aria-label={`${option.count} หลัง`}>{option.count}</span>
                      </label>
                    );
                  })}
                </div>
                <p role="status" className="text-[12px] text-gray-500 mt-3">
                  {statusFilter?.length === 0 ? 'ยังไม่ได้เลือกสถานะบ้าน' : `แสดง ${visible.houses} หลัง ตามตัวกรองที่เลือก`}
                </p>
              </fieldset>

              {data && <HighlightsSummary data={data} updates={highlightUpdates} onStatusChange={handleHighlightStatus} onSelect={focusHouse} />}

              {summary && (
                <div className="mt-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                  <span className="text-[12px] text-gray-400 mr-1">ประเภท</span>
                  {summary.styles.map((key) => (
                    <FilterChip
                      key={key}
                      active={styleFilter === key}
                      onClick={() => setStyleFilter(styleFilter === key ? null : key)}
                    >
                      {STYLE_LABELS[key]} <b>{summary.styleTotals[key]}</b>
                    </FilterChip>
                  ))}

                  <span className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />
                  <span className="text-[12px] text-gray-400 mr-1">ขนาด (ตร.ว.)</span>
                  {summary.sizes.map((bucket) => (
                    <FilterChip
                      key={bucket.key}
                      active={sizeFilter === bucket.key}
                      onClick={() => setSizeFilter(sizeFilter === bucket.key ? null : bucket.key)}
                    >
                      {bucket.label} <b>{summary.sizeTotals[bucket.key]}</b>
                    </FilterChip>
                  ))}

                  {(styleFilter || sizeFilter) && (
                    <button
                      onClick={() => { setStyleFilter(null); setSizeFilter(null); }}
                      className="ml-auto text-[12px] text-gray-500 hover:text-brand-green underline"
                    >
                      ล้างตัวกรองประเภท/ขนาด
                    </button>
                  )}
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-4 mt-4">
                <section ref={mapSection} className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 text-[13px]">
                    <button
                      onClick={() => handleViewChange({ zone: null, project: null })}
                      className={`flex items-center gap-1 ${view.zone ? 'text-brand-green hover:underline' : 'text-gray-400 cursor-default'}`}
                      disabled={!view.zone}
                    >
                      <Layers size={15} /> ทุกทำเล
                    </button>
                    {view.zone && (
                      <>
                        <ChevronRight size={14} className="text-gray-300" />
                        <button
                          onClick={() => handleViewChange({ zone: view.zone, project: null })}
                          className={view.project ? 'text-brand-green hover:underline' : 'text-gray-700 font-medium cursor-default'}
                          disabled={!view.project}
                        >
                          {view.zone}
                        </button>
                      </>
                    )}
                    {view.project && (
                      <>
                        <ChevronRight size={14} className="text-gray-300" />
                        <span className="text-gray-700 font-medium">{view.project}</span>
                      </>
                    )}
                    <span className="ml-auto flex items-center gap-3 text-[12px] text-gray-500">
                      {GROUP_ORDER.map((key) => (
                        <span key={key} className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: GROUP_META[key].color }} />
                          {GROUP_META[key].label}
                        </span>
                      ))}
                    </span>
                  </div>

                  {view.zone && (
                    <div className="px-4 py-2 bg-brand-light/60 text-[12px] text-brand-green flex items-center gap-2">
                      <button
                        onClick={() => handleViewChange(view.project ? { zone: view.zone, project: null } : { zone: null, project: null })}
                        className="flex items-center gap-1 font-medium hover:underline"
                      >
                        <ArrowLeft size={13} /> ย้อนกลับ
                      </button>
                      <span className="text-gray-500">
                        {activeProject
                          ? `${activeProject.name} · ${activeProject.houseCount} หลัง`
                          : activeZone && `${activeZone.name} · ${activeZone.projectCount} โครงการ · ${activeZone.houseCount} หลัง`}
                      </span>
                    </div>
                  )}

                  <StockMap
                    zones={zones}
                    view={view}
                    onViewChange={handleViewChange}
                    activeHouseKey={activeHouseKey}
                    onHighlightStatusChange={handleHighlightStatus}
                    route={route}
                    onToggleRoute={toggleRoute}
                    onSelectRouteStop={focusHouse}
                  />
                </section>

                <aside className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหาทำเล / โครงการ / บ้านเลขที่"
                        className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-gray-200 focus:border-brand-green outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[520px] lg:max-h-[calc(100vh-320px)]">
                    {!zones.length && (
                      <p className="p-6 text-center text-gray-400 text-[13px]">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                    )}

                    {zoneGroups.map((group) => (
                      <div key={group.area}>
                        {group.zones.length > 1 && (
                          <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur px-3 py-1.5 border-y border-gray-100 flex items-baseline gap-2">
                            <span className="text-[12px] font-semibold text-gray-600">{group.area}</span>
                            <span className="text-[11px] text-gray-400">
                              {group.zones.length} ทำเล · {group.total} หลัง
                            </span>
                          </div>
                        )}

                        {group.zones.map(({ zone, shortLabel }) => {
                          const open = !!openZones[zone.name];
                          const rowLabel = group.zones.length > 1 && shortLabel ? shortLabel : zone.name;
                          return (
                        <div key={zone.name} className="border-b border-gray-100">
                          <button
                            onClick={() => {
                              // กดซ้ำที่ทำเลที่เปิดอยู่ = ย่อกลับ แล้วถอยแผนที่ไปมุมมองรวม
                              if (open) {
                                setOpenZones((prev) => ({ ...prev, [zone.name]: false }));
                                if (view.zone === zone.name) setView({ zone: null, project: null });
                                setActiveHouseKey(null);
                                return;
                              }
                              handleViewChange({ zone: zone.name, project: null });
                            }}
                            className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition ${view.zone === zone.name ? 'bg-brand-light' : 'hover:bg-gray-50'}`}
                          >
                            {open ? <ChevronDown size={15} className="text-gray-400 flex-none" /> : <ChevronRight size={15} className="text-gray-400 flex-none" />}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14px] font-medium text-gray-800 truncate">{rowLabel}</span>
                              <span className="block text-[11px] text-gray-500">
                                {zone.projectCount} โครงการ · {zone.houseCount} หลัง
                              </span>
                            </span>
                            <span className="flex gap-1 flex-none">
                              {GROUP_ORDER.filter((key) => zone.counts[key] > 0).map((key) => (
                                <span
                                  key={key}
                                  title={GROUP_META[key].label}
                                  className="text-[11px] font-semibold text-white rounded-full px-1.5 py-0.5 min-w-[22px] text-center"
                                  style={{ background: GROUP_META[key].color }}
                                >
                                  {zone.counts[key]}
                                </span>
                              ))}
                            </span>
                          </button>

                          {open && (
                            <div className="pb-2">
                              {zone.projects.map((project) => {
                                const projectOpen = view.zone === zone.name && view.project === project.name;
                                return (
                                  <div key={project.name} className="px-3">
                                    <button
                                      onClick={() => handleViewChange(
                                        projectOpen ? { zone: zone.name, project: null } : { zone: zone.name, project: project.name }
                                      )}
                                      className={`w-full text-left pl-4 pr-2 py-1.5 rounded-lg flex items-center gap-2 transition ${projectOpen ? 'bg-brand-green text-white' : 'hover:bg-gray-50'}`}
                                    >
                                      <span className="min-w-0 flex-1 truncate text-[13px]">{project.name}</span>
                                      <span className={`text-[11px] flex-none ${projectOpen ? 'text-white/80' : 'text-gray-500'}`}>
                                        {project.houseCount} หลัง
                                      </span>
                                      {project.counts.wip > 0 && (
                                        <span
                                          className="text-[10px] font-semibold text-white rounded-full px-1.5 flex-none"
                                          style={{ background: GROUP_META.wip.color }}
                                          title={`ยังไม่เสร็จ ${project.counts.wip} หลัง`}
                                        >
                                          {project.counts.wip}
                                        </span>
                                      )}
                                    </button>

                                    {projectOpen && (
                                      <div className="pl-4 py-2 space-y-1.5">
                                        {project.houses.map((house) => (
                                          <HouseRow
                                            key={house.uid}
                                            house={house}
                                            active={activeHouseKey === house.uid}
                                            onClick={() => setActiveHouseKey(
                                              activeHouseKey === house.uid ? null : house.uid
                                            )}
                                            routeNo={route.findIndex((stop) => stop.uid === house.uid) + 1}
                                            routeFull={route.length >= MAX_ROUTE_STOPS}
                                            onToggleRoute={() => toggleRoute(house)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </aside>
              </div>

              {summary && summary.total > 0 && (
                <div className="grid lg:grid-cols-2 gap-4 mt-4">
                  <section className="min-w-0 bg-white rounded-2xl border border-gray-200 p-4">
                    <h2 className="text-[14px] font-semibold text-gray-800">ประเภทบ้าน × ขนาด</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      หน่วยเป็น ตร.ว. · กดที่ตัวเลขเพื่อกรองดูเฉพาะกลุ่มนั้น
                    </p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-[12px] border-collapse">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left font-normal py-1 pr-2">ประเภท</th>
                            {summary.sizes.map((bucket) => (
                              <th key={bucket.key} className="font-normal px-1 py-1 whitespace-nowrap">{bucket.label}</th>
                            ))}
                            {summary.noSize > 0 && <th className="font-normal px-1 py-1">ไม่ระบุ</th>}
                            <th className="font-normal pl-2 py-1">รวม</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.styles.map((style) => (
                            <tr key={style} className="border-t border-gray-100">
                              <th className="text-left font-medium text-gray-700 py-1 pr-2 whitespace-nowrap">
                                {STYLE_LABELS[style]}
                              </th>
                              {summary.sizes.map((bucket) => (
                                <MatrixCell
                                  key={bucket.key}
                                  value={summary.byStyleSize[style][bucket.key]}
                                  active={styleFilter === style && sizeFilter === bucket.key}
                                  onClick={() => {
                                    const same = styleFilter === style && sizeFilter === bucket.key;
                                    setStyleFilter(same ? null : style);
                                    setSizeFilter(same ? null : bucket.key);
                                  }}
                                />
                              ))}
                              {summary.noSize > 0 && (
                                <td className="px-2 py-1.5 text-center text-gray-400">
                                  {summary.byStyleSize[style].none || '–'}
                                </td>
                              )}
                              <td className="pl-2 py-1.5 text-right font-bold text-brand-green">
                                {summary.styleTotals[style]}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-200 text-gray-500">
                            <th className="text-left font-medium py-1.5 pr-2">รวม</th>
                            {summary.sizes.map((bucket) => (
                              <td key={bucket.key} className="px-2 py-1.5 text-center font-semibold">
                                {summary.sizeTotals[bucket.key]}
                              </td>
                            ))}
                            {summary.noSize > 0 && <td className="px-2 py-1.5 text-center">{summary.noSize}</td>}
                            <td className="pl-2 py-1.5 text-right font-bold text-brand-green">{summary.total}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {summary.noSize > 0 && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        “ไม่ระบุ” คือห้องชุดที่วัดเป็น ตร.ม. จึงไม่จัดเข้าช่วง ตร.ว.
                      </p>
                    )}
                  </section>

                  <section className="min-w-0 bg-white rounded-2xl border border-gray-200 p-4">
                    <h2 className="text-[14px] font-semibold text-gray-800">ประเภทบ้าน × ทำเล</h2>
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      กดที่ตัวเลขเพื่อซูมไปทำเลนั้นพร้อมกรองประเภท
                    </p>
                    <div className="mt-3 overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin">
                      <table className="w-full text-[12px] border-collapse">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-gray-400">
                            <th className="text-left font-normal py-1 pr-2">ทำเล</th>
                            {summary.styles.map((style) => (
                              <th key={style} className="font-normal px-1 py-1 whitespace-nowrap">
                                {STYLE_LABELS[style].replace(' / ', '/')}
                              </th>
                            ))}
                            <th className="font-normal pl-2 py-1">รวม</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.zones.map((zone) => (
                            <tr key={zone.name} className="border-t border-gray-100">
                              <th className="text-left font-medium text-gray-700 py-1 pr-2 whitespace-nowrap">
                                {zone.name}
                              </th>
                              {summary.styles.map((style) => (
                                <MatrixCell
                                  key={style}
                                  value={zone.byStyle[style]}
                                  active={styleFilter === style && view.zone === zone.name}
                                  onClick={() => {
                                    setStyleFilter(style);
                                    handleViewChange({ zone: zone.name, project: null });
                                  }}
                                />
                              ))}
                              <td className="pl-2 py-1.5 text-right font-bold text-brand-green">{zone.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {unlocated.length > 0 && (
                <section className="mt-4 bg-white rounded-2xl border border-amber-200 p-4">
                  <h2 className="text-[14px] font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={16} /> บ้านที่ยังไม่มีพิกัดบนแผนที่ ({unlocated.length} หลัง)
                  </h2>
                  <p className="text-[12px] text-gray-500 mt-1">
                    ไม่มีลิงก์ Google Maps ในคอลัมน์ Location และไม่พบบ้าน/โครงการนี้ในเว็บหลัก — เพิ่มลิงก์ในชีตแล้วกด “ดึงข้อมูลใหม่” จะขึ้นแผนที่ทันที
                  </p>
                  <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {unlocated.map((house) => (
                      <div key={house.uid} className="text-[12px] border border-gray-100 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-800">{house.project}</span>
                        <span className="text-gray-500"> · {house.houseNumber || '—'}</span>
                        <span className="block text-gray-400">
                          {house.owner !== 'startup' && `${OWNER_META[house.owner]?.label} · `}
                          {house.zone || 'ไม่ระบุทำเล'} · {house.rawStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data && (
                <footer className="mt-6 text-center text-[12px] text-gray-400 pb-6">
                  ที่มา: Google Sheet “Stockบ้าน” และชีต Stock ของพาร์ทเนอร์ (Naphat, เจ๊หมวย, ใบชา, Notting) · พิกัดจากลิงก์ Location ในชีต เสริมด้วยพิกัดบ้านจากเว็บหลัก ·{' '}
                  <a href={data.sheetUrl} target="_blank" rel="noreferrer" className="text-brand-green hover:underline inline-flex items-center gap-1">
                    เปิดชีตต้นทาง <ExternalLink size={11} />
                  </a>
                </footer>
              )}
            </>
          )}
        </main>
        <RoutePlanner stops={route} onChange={setRoute} onSelect={focusHouse} />
      </div>
    </>
  );
}
