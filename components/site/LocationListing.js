/* eslint-disable @next/next/no-html-link-for-pages -- Category links keep the exact URLs GTM click triggers match. */
import { useMemo, useState } from 'react';
import { selectListingProperties } from '../../lib/listingPagination';
import { primaryPropertyLocation } from '../../lib/websiteInventory';
import { searchResultHref } from './SiteApp';
import HouseCard, { PAYMENT_NOTE, areaHeadline } from './HouseCard';

const CATEGORIES = ['ทาวน์เฮาส์', 'บ้านแฝด', 'บ้านเดี่ยว'];
const areaOf = property => primaryPropertyLocation(property)?.name || property.main_location || property.district || '';
const priceNumber = price => Number(String(price || 0).replace(/,/g, '')) || 0;

/**
 * ?tab=location — หน้าที่โฆษณาพามา ต้องเห็นบ้านพร้อมราคาตั้งแต่ HTML แรก
 * ไม่มีวิดีโอฉากเปิด ชิปทำเลกรองในหน้า (ไม่เปลี่ยน URL จึงไม่แตะพารามิเตอร์โฆษณา)
 * #home-locations คงไว้ให้ GA4 view_locations ใน GTM ยังยิงได้
 */
export default function LocationListing({ properties = [], listing, onSelectProp, isEditMode = false }) {
  const homes = useMemo(() => selectListingProperties(properties, {}, { near: listing?.near || '' }), [properties, listing?.near]);
  const areas = useMemo(() => {
    const counts = new Map();
    for (const home of homes) { const area = areaOf(home); if (area) counts.set(area, (counts.get(area) || 0) + 1); }
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [homes]);
  const [area, setArea] = useState('');
  const shown = area ? homes.filter(home => areaOf(home) === area) : homes;
  const prices = homes.map(home => priceNumber(home.price)).filter(price => price > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-12 md:py-14 min-h-screen">
      <p className="text-sm font-medium text-[#98691d]">บ้านพร้อมขาย {homes.length} หลัง{prices.length ? ` · เริ่ม ${Math.min(...prices).toLocaleString('th-TH')} บาท` : ''}</p>
      <h1 className="mt-1 text-[26px] md:text-3xl leading-snug font-medium text-brand-green">{areaHeadline(properties) || 'บ้านรีโนเวท ปทุมธานี'}</h1>

      <nav id="home-locations" aria-label="เลือกทำเล" className="mt-4 -mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[['', homes.length], ...areas].map(([name, count]) => (
          <button key={name || 'all'} type="button" aria-pressed={area === name} onClick={() => setArea(name)}
            className={`shrink-0 rounded-full border px-4 min-h-[40px] text-sm transition ${area === name ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-green'}`}>
            {name || 'ทุกทำเล'} <span className={area === name ? 'text-white/75' : 'text-gray-400'}>{count}</span>
          </button>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <span>ประเภทบ้าน:</span>
        {CATEGORIES.map(category => <a key={category} href={searchResultHref('category', category)} className="text-brand-green underline underline-offset-4 min-h-[32px] inline-flex items-center">{category}</a>)}
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 justify-items-center sm:justify-items-stretch">
        {shown.map((home, index) => <HouseCard key={home.id} property={home} index={index} heading="h2" onSelect={onSelectProp} isEditMode={isEditMode} />)}
      </div>
      {shown.length === 0 && <p className="py-16 text-center text-gray-400">ยังไม่มีบ้านพร้อมขายในทำเลนี้ กรุณาสอบถามทีมงาน</p>}
      {shown.length > 0 && <p className="mt-6 text-xs text-gray-400 text-center">{PAYMENT_NOTE}</p>}
    </div>
  );
}
