import { useEffect, useRef, useState } from 'react';
import { GROUP_META } from '../lib/stock';

const MAP_CENTER = [13.99, 100.63];
const MAP_ZOOM = 11;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatPrice = (price) => (price ? `฿ ${price.toLocaleString('th-TH')}` : 'ยังไม่ระบุราคา');

const countsLabel = (counts) => Object.entries(counts)
  .filter(([, value]) => value > 0)
  .map(([key, value]) => `${GROUP_META[key].label} ${value}`)
  .join(' · ');

const housePopup = (house) => {
  const rows = [
    ['ทำเล', house.zone],
    ['ซอย', house.soi],
    ['รูปแบบ', house.style],
    ['พื้นที่', house.area],
    ['ห้องนอน/ห้องน้ำ', house.bedrooms || house.bathrooms ? `${house.bedrooms || '-'} / ${house.bathrooms || '-'}` : ''],
    ['เริ่มทำ', house.startedAt],
    ['ทำเสร็จเมื่อ', house.finishedAt],
    ['ช่างที่ทำบ้าน', house.worker],
  ].filter(([, value]) => value);

  const meta = GROUP_META[house.group];
  const approx = house.precision !== 'exact'
    ? `<div class="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">ตำแหน่งโดยประมาณ (อ้างอิงจุดกึ่งกลาง${house.precision === 'zone' ? 'ทำเล' : 'โครงการ'})</div>`
    : '';
  const link = house.mapUrl
    ? `<a href="${escapeHtml(house.mapUrl)}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-[12px] text-blue-700 underline">เปิดใน Google Maps</a>`
    : '';

  return `
    <div class="w-60">
      <div class="text-[11px] tracking-wide" style="color:${meta.color}">${escapeHtml(house.rawStatus === meta.label ? meta.label : `${meta.label} · ${house.rawStatus}`)}</div>
      <div class="font-semibold text-[15px] text-gray-900 mt-0.5">${escapeHtml(house.project)}</div>
      <div class="text-[13px] text-gray-600">บ้านเลขที่ ${escapeHtml(house.houseNumber || '-')}</div>
      <div class="font-bold text-[15px] mt-1" style="color:#0b3d1b">${escapeHtml(formatPrice(house.price))}</div>
      <table class="mt-2 w-full text-[12px] text-gray-600">
        ${rows.map(([label, value]) => `<tr><td class="pr-2 py-0.5 text-gray-400 align-top whitespace-nowrap">${escapeHtml(label)}</td><td class="py-0.5">${escapeHtml(value)}</td></tr>`).join('')}
      </table>
      ${approx}
      ${link}
    </div>`;
};

export default function StockMap({ zones, view, onViewChange, activeHouseKey }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const leafletRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      let L;
      try {
        L = (await import('leaflet')).default;
      } catch (error) {
        console.warn('Unable to load Leaflet:', error);
        return;
      }
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;
      mapRef.current = L.map(containerRef.current, {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        scrollWheelZoom: true,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
        maxZoom: 19,
        referrerPolicy: 'strict-origin-when-cross-origin',
        updateWhenIdle: true,
        keepBuffer: 1,
      }).addTo(mapRef.current);
      layerRef.current = L.layerGroup().addTo(mapRef.current);
      setReady(true);
    };

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      layerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    const bounds = [];

    // ทุกป้ายต้องมีวงกลมเล็กอยู่ซ้ายสุดเป็นตัวชี้ตำแหน่ง แล้ว "วงกลมนั้น" คือจุดที่ทับพิกัดจริง
    // ถ้าไม่มีวงกลม ตัวป้ายจะลอยอยู่เฉยๆ ดูไม่ออกว่าพิกัดจริงอยู่ตรงไหน
    // ระยะจากขอบซ้ายป้ายถึงกลางวงกลม = ขอบ 2 + padding 12 + ครึ่งวงกลม 4 = 18px
    const DOT_CENTER_X = 18;
    const PILL_CENTER_Y = 14;

    const pill = (html, variant, extraClass = '') => L.divIcon({
      className: '',
      html: `<div class="map-pill ${variant} ${extraClass}">${html}</div>`,
      iconSize: null,
      iconAnchor: [DOT_CENTER_X, PILL_CENTER_Y],
    });

    const dot = (color) => `<span class="dot" style="background:${color}"></span>`;

    const activeZone = view.zone ? zones.find((zone) => zone.name === view.zone) : null;
    const activeProject = activeZone && view.project
      ? activeZone.projects.find((project) => project.name === view.project)
      : null;

    if (activeProject) {
      activeProject.houses.forEach((house) => {
        if (!house.coords) return;
        bounds.push(house.coords);
        const meta = GROUP_META[house.group];
        const isActive = activeHouseKey === house.rowIndex;
        const marker = L.marker(house.coords, {
          icon: pill(
            `${dot(isActive ? '#fff' : 'rgba(255,255,255,.65)')}${escapeHtml(house.houseNumber || meta.label)}`,
            house.group,
            house.precision === 'exact' ? '' : 'approx'
          ),
          zIndexOffset: isActive ? 1000 : 0,
        }).addTo(layer);
        marker.bindPopup(housePopup(house), { maxWidth: 280 });
        if (isActive) marker.openPopup();
      });
    } else if (activeZone) {
      activeZone.projects.forEach((project) => {
        if (!project.coords) return;
        bounds.push(project.coords);
        const marker = L.marker(project.coords, {
          icon: pill(`${dot('#0b3d1b')}${escapeHtml(project.name)} · ${project.houseCount} หลัง`, 'proj'),
          // โครงการที่มีบ้านเยอะให้อยู่ชั้นบน จะได้ไม่ถูกป้ายเล็กบัง
          zIndexOffset: project.houseCount * 10,
        }).addTo(layer);
        marker.bindTooltip(countsLabel(project.counts) || 'ไม่มีข้อมูล', { direction: 'top', offset: [0, -6] });
        marker.on('click', () => onViewChange({ zone: activeZone.name, project: project.name }));
      });
    } else {
      zones.forEach((zone) => {
        if (!zone.coords) return;
        bounds.push(zone.coords);
        const marker = L.marker(zone.coords, {
          icon: pill(`${dot('#0b3d1b')}${zone.projectCount} โครงการ`, 'zone'),
          zIndexOffset: zone.houseCount * 10,
        }).addTo(layer);
        marker.bindTooltip(
          `<b>${escapeHtml(zone.name)}</b><br/>${zone.projectCount} โครงการ · ${zone.houseCount} หลัง<br/>${countsLabel(zone.counts)}`,
          { direction: 'top', offset: [0, -6] }
        );
        marker.on('click', () => onViewChange({ zone: zone.name, project: null }));
      });
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: activeProject ? 18 : 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], activeProject ? 17 : 14);
    } else {
      map.setView(MAP_CENTER, MAP_ZOOM);
    }
  }, [ready, zones, view, activeHouseKey, onViewChange]);

  return <div ref={containerRef} className="w-full h-[420px] lg:h-[calc(100vh-260px)] lg:min-h-[520px]" />;
}
