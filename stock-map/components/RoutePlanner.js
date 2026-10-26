import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, LoaderCircle, Navigation, Route, Trash2, X } from 'lucide-react';
import { OWNER_META } from '../lib/stock';
import { inThailand } from '../lib/mapurl.mjs';
import { MAX_ROUTE_STOPS, googleMapsRouteUrl, moveRouteStop, planRoute } from '../lib/route.mjs';

// ตำแหน่งปัจจุบันของเครื่อง — ไม่อนุญาต/หาไม่เจอ/อยู่นอกไทย ให้ถือว่าไม่มี
const currentPosition = () => new Promise((resolve) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return; }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve(inThailand(coords.latitude, coords.longitude) ? [coords.latitude, coords.longitude] : null),
    () => resolve(null),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
  );
});

const routeKey = (stops) => stops.map((stop) => stop.uid).join('|');

const formatTrip = ({ distanceM, durationS }) => {
  const km = `${(distanceM / 1000).toFixed(distanceM < 10000 ? 1 : 0)} กม.`;
  if (durationS === null) return km;
  const minutes = Math.round(durationS / 60);
  return `${km} · ขับรถประมาณ ${minutes >= 60 ? `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที` : `${minutes} นาที`}`;
};

/**
 * แผงเส้นทางลอยอยู่ล่างจอ — โผล่เมื่อมีบ้านในเส้นทางอย่างน้อย 1 หลัง
 * กดบ้านบนแผนที่/รายการเพื่อเพิ่ม แล้วกดเปิดใน Google Maps เพื่อนำทางทีละจุด
 */
export default function RoutePlanner({ stops, onChange, onSelect }) {
  // จอมือถือเริ่มแบบย่อ ไม่ให้แผงบังแผนที่ (ยังกดเปิด Google Maps จากแถบย่อได้เลย)
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 640);
  const [planning, setPlanning] = useState(false);
  // ผลการจัดเส้นทางล่าสุด ผูกกับชุด/ลำดับบ้านตอนนั้น — ถ้าเพิ่ม/ลบ/สลับเอง ข้อความสรุปจะหายไป
  const [plan, setPlan] = useState(null);
  if (!stops.length) return null;

  const url = googleMapsRouteUrl(stops);
  const approximate = stops.filter((stop) => stop.precision !== 'exact').length;
  const planned = plan && plan.key === routeKey(stops) ? plan : null;

  const optimize = async () => {
    setPlanning(true);
    try {
      const origin = await currentPosition();
      const result = await planRoute(stops, origin);
      onChange(result.stops);
      setPlan({ ...result, fromHere: !!origin, key: routeKey(result.stops) });
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] px-3 pb-3 pointer-events-none flex justify-end">
      <section
        aria-label="เส้นทางที่เลือก"
        className="pointer-events-auto w-full sm:w-[400px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
      >
        <div className="flex items-stretch bg-brand-green text-white">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="flex-1 min-h-12 px-4 py-2.5 flex items-center gap-2 text-left"
          >
            <Navigation size={16} className="flex-none" />
            <span className="flex-1 text-[14px] font-semibold">
              เส้นทางที่เลือก {stops.length}/{MAX_ROUTE_STOPS} จุด
            </span>
            {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          {!open && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex-none my-2 mr-2 rounded-lg bg-white text-brand-green text-[13px] font-semibold px-3 flex items-center gap-1.5"
            >
              <ExternalLink size={14} /> Google Maps
            </a>
          )}
        </div>

        {open && (
          <>
            <ol className="max-h-[38vh] overflow-y-auto scrollbar-thin divide-y divide-gray-100">
              {stops.map((stop, i) => {
                const owner = OWNER_META[stop.owner];
                return (
                  <li key={stop.uid} className="flex items-center gap-2 pl-3 pr-1 py-1.5">
                    <span className="w-6 h-6 rounded-full bg-brand-green text-white text-[12px] font-bold grid place-items-center flex-none">
                      {i + 1}
                    </span>
                    <button type="button" onClick={() => onSelect(stop)} className="min-w-0 flex-1 text-left py-1">
                      <span className="block text-[13px] font-medium text-gray-800 truncate">
                        {stop.project} · {stop.houseNumber || '—'}
                      </span>
                      <span className="block text-[11px] text-gray-500 truncate">
                        {owner && stop.owner !== 'startup' && <span style={{ color: owner.color }}>{owner.label} · </span>}
                        {stop.zone || 'ไม่ระบุทำเล'}
                        {stop.precision !== 'exact' && <span className="text-amber-700"> · ตำแหน่งโดยประมาณ</span>}
                      </span>
                    </button>
                    <span className="flex flex-none">
                      <button type="button" onClick={() => onChange(moveRouteStop(stops, i, -1))} disabled={i === 0} aria-label="เลื่อนขึ้น" className="w-9 h-10 grid place-items-center text-gray-500 hover:text-brand-green disabled:opacity-25">
                        <ChevronUp size={16} />
                      </button>
                      <button type="button" onClick={() => onChange(moveRouteStop(stops, i, 1))} disabled={i === stops.length - 1} aria-label="เลื่อนลง" className="w-9 h-10 grid place-items-center text-gray-500 hover:text-brand-green disabled:opacity-25">
                        <ChevronDown size={16} />
                      </button>
                      <button type="button" onClick={() => onChange(stops.filter((s) => s.uid !== stop.uid))} aria-label="เอาออกจากเส้นทาง" className="w-9 h-10 grid place-items-center text-gray-400 hover:text-red-600">
                        <X size={16} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="border-t border-gray-100 p-3 space-y-2">
              {approximate > 0 && (
                <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
                  <AlertTriangle size={13} className="mt-0.5 flex-none" />
                  {approximate} จุดเป็นตำแหน่งโดยประมาณ (กลางโครงการ) — ใกล้ถึงแล้วให้ดูบ้านเลขที่อีกครั้ง
                </p>
              )}
              <div className="flex gap-2 text-[13px]">
                <button
                  type="button"
                  onClick={optimize}
                  disabled={planning}
                  className="min-h-11 flex-1 rounded-lg border-2 border-brand-green bg-brand-light px-2 flex items-center justify-center gap-1.5 font-semibold text-brand-green disabled:opacity-60"
                >
                  {planning ? <LoaderCircle size={15} className="animate-spin" /> : <Route size={15} />}
                  {planning ? 'กำลังคำนวณเส้นทาง…' : 'จัดเส้นทางให้สั้นที่สุด'}
                </button>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="min-h-11 rounded-lg border border-gray-200 px-3 flex items-center gap-1.5 text-gray-600 hover:border-red-300 hover:text-red-600"
                >
                  <Trash2 size={14} /> ล้าง
                </button>
              </div>
              {planned ? (
                <p role="status" className="text-[11px] text-brand-green">
                  ✓ จัดแล้ว{planned.fromHere ? 'จากตำแหน่งปัจจุบัน' : ''} ตาม{planned.road ? 'เวลาขับรถบนถนนจริง' : 'ระยะเส้นตรง (เชื่อมต่อระบบคำนวณถนนไม่ได้)'} · รวม {formatTrip(planned)}
                  {!planned.fromHere && ' — ไม่ได้ใช้ตำแหน่งปัจจุบัน (ไม่ได้อนุญาต/หาไม่เจอ) จึงเลือกจุดเริ่มให้เอง'}
                </p>
              ) : stops.length > 1 && (
                <p className="text-[11px] text-gray-500">
                  ลำดับตอนนี้ยังเป็นลำดับที่กดเพิ่ม — กด “จัดเส้นทางให้สั้นที่สุด” ก่อนเปิด Google Maps จะได้ไม่วิ่งย้อนไปมา
                </p>
              )}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="min-h-12 rounded-xl bg-brand-green text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:opacity-90"
              >
                <ExternalLink size={16} /> เปิดเส้นทางใน Google Maps
              </a>
              <p className="text-[11px] text-gray-400 text-center">
                เริ่มจากตำแหน่งปัจจุบันของคุณ แล้วแวะตามลำดับ 1 → {stops.length}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
