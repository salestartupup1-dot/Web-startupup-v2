import { useEffect, useMemo, useState } from 'react';
import { highlightKey } from '../lib/highlights.mjs';
import { summarizeHighlightStatuses } from '../lib/highlightSummary.mjs';
import HouseHighlights from './HouseHighlights';

export default function HighlightsSummary({ data, updates, onStatusChange, onSelect }) {
  const [result, setResult] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0), [unlocated, setUnlocated] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('/api/highlights-status', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then(setResult).catch(e => {
      if (e.name !== 'AbortError') setError('ตรวจสอบจุดเด่นไม่สำเร็จ กรุณาลองใหม่');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [data, retry]);
  const houses = useMemo(() => data.zones.flatMap(z => z.projects.flatMap(p => p.houses)), [data]);
  const recentUpdates = Object.fromEntries(Object.entries(updates).filter(([, update]) => update.at >= Date.parse(result?.checkedAt || '1970-01-01')).map(([key, update]) => [key, update.value]));
  const { missing, unknown, complete } = summarizeHighlightStatuses(houses, { ...result?.statuses, ...recentUpdates });
  return <section aria-label="สรุปจุดเด่นของบ้าน" className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold text-brand-green">บ้านที่ยังไม่มีจุดเด่น{!loading && !error && <> <span className="text-amber-700">{missing.length.toLocaleString('th-TH')} หลัง</span></>}</h2>
        <p className="mt-1 text-xs text-gray-500">บ้านทั้งหมดใน Stock {houses.length.toLocaleString('th-TH')} หลัง · ไม่รวมบ้านขายแล้ว · ตรวจทั้งเว็บหลักและที่กรอกเอง</p>
      </div>
      <button type="button" onClick={() => setRetry(n => n + 1)} disabled={loading} className="min-h-10 rounded-lg border border-gray-200 px-3 text-xs text-brand-green disabled:opacity-50">ตรวจสอบอีกครั้ง</button>
    </div>
    {loading ? <p role="status" className="mt-3 text-sm text-gray-500">กำลังตรวจสอบจุดเด่นของบ้านทั้งหมด…</p> : error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : <>
      <p className="mt-2 text-xs text-gray-500">มีจุดเด่นแล้ว {complete.toLocaleString('th-TH')} หลัง{unknown.length > 0 && ` · รอตรวจสอบ ${unknown.length} หลัง`}{result?.checkedAt && ` · ตรวจล่าสุด ${new Date(result.checkedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`}</p>
      {unknown.length > 0 && <p role="status" className="mt-2 text-xs text-amber-700">ข้อมูลบ้านบางหลังเพิ่งเปลี่ยน กรุณาตรวจสอบอีกครั้งในหนึ่งนาที</p>}
      {missing.length ? <ul className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3" aria-label="รายชื่อบ้านที่ยังไม่มีจุดเด่น">
        {missing.map(house => <li key={house.rowIndex}>
          <button type="button" onClick={() => house.coords ? onSelect(house) : setUnlocated(house)} className="w-full rounded-xl border border-gray-200 px-3 py-3 text-left hover:border-brand-green hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-brand-green">
            <span className="block text-sm font-semibold text-brand-green">{house.project} · {house.houseNumber || 'ไม่ระบุเลขที่'}</span>
            <span className="mt-1 block text-xs text-gray-500">{house.zone || 'ไม่ระบุทำเล'} · {house.rawStatus}{!house.coords && ' · ยังไม่มีพิกัด'}</span>
          </button>
        </li>)}
      </ul> : !unknown.length && <p role="status" className="mt-3 text-sm text-brand-green">บ้านทุกหลังมีจุดเด่นแล้ว</p>}
    </>}
    {unlocated && <div className="mt-4 rounded-xl border border-gray-200 p-3">
      <div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">{unlocated.project} · {unlocated.houseNumber}</h3><button type="button" className="min-h-10 px-3 text-sm underline" onClick={() => setUnlocated(null)}>ปิดรายละเอียด</button></div>
      <p className="text-xs text-gray-500">บ้านหลังนี้ยังไม่มีพิกัด สามารถเพิ่มจุดเด่นได้ที่นี่</p>
      <HouseHighlights key={highlightKey(unlocated)} house={unlocated} onStatusChange={onStatusChange} />
    </div>}
  </section>;
}
