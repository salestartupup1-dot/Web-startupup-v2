import { Bath, Bed, Home, MapPin, Maximize } from 'lucide-react';
import { SmartImage, getOptimizedImg, getPropertySharePath } from './SiteApp';
import { monthlyMortgage } from '../../lib/mortgage';
import { isSaleAvailable, primaryPropertyLocation } from '../../lib/websiteInventory';

// Card estimate only: full listed price, 3% a year over 40 years (owner's choice).
// The calculator keeps its own adjustable assumptions.
export const CARD_RATE = 3;
export const CARD_YEARS = 40;
export const cardPayment = price => Math.round(monthlyMortgage(price, CARD_RATE, CARD_YEARS));
export const PAYMENT_NOTE = `*ประมาณการผ่อน กู้เต็มราคา ดอกเบี้ย ${CARD_RATE}% ระยะ ${CARD_YEARS} ปี ไม่ใช่ผลอนุมัติจากธนาคาร`;

const priceNumber = price => Number(String(price || 0).replace(/,/g, '')) || 0;

// "บ้านรีโนเวท คลองหลวง · ลำลูกกา · ธัญบุรี" — the districts with the most bookable houses right now.
export function areaHeadline(properties = [], limit = 3) {
  const counts = new Map();
  for (const property of properties) {
    const name = isSaleAvailable(property) && primaryPropertyLocation(property)?.name;
    if (name && name !== 'ปทุมธานี') counts.set(name, (counts.get(name) || 0) + 1);
  }
  const names = [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name]) => name);
  return names.length ? `บ้านรีโนเวท ${names.join(' · ')}` : '';
}

/**
 * การ์ดบ้านในหน้ารายการ — ราคากับยอดผ่อนต่อเดือนต้องเห็นได้ทันทีบนมือถือ
 * กล่องยอดผ่อนใช้พื้นเขียวเข้ม + ตัวเลขสีทอง ให้เด่นกว่าทุกอย่างในการ์ด
 */
export default function HouseCard({ property: p, index = 0, heading: CardHeading = 'h3', onSelect, isEditMode = false }) {
  const image = p.images?.[0] || p.imageUrl;
  const price = priceNumber(p.price);
  const payment = cardPayment(price);
  return (
    <a
      href={getPropertySharePath(p)}
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey && !e.button) {
          e.preventDefault();
          if (!isEditMode) onSelect?.(p);
        }
      }}
      className={`listing-card group block w-full max-w-[420px] sm:max-w-none bg-white border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden flex flex-col ${isEditMode ? 'pointer-events-none cursor-default' : 'cursor-pointer'}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100 pointer-events-none">
        {image && <SmartImage
          src={getOptimizedImg(image, 720)}
          srcSet={`${getOptimizedImg(image, 400)} 400w, ${getOptimizedImg(image, 720)} 720w`}
          sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 45vw, 300px"
          alt={`${p.category || 'บ้าน'} ${p.project_name || ''}`.trim()}
          width={720} height={450}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading={index === 0 ? 'eager' : 'lazy'} priority={index === 0} decoding="async"
        />}
        {p.category && <span className="absolute top-3 left-3 bg-white/95 text-gray-700 px-3 py-1.5 rounded-full font-medium text-xs shadow-sm flex items-center gap-1.5"><Home size={14} className="text-brand-green" />{p.category}</span>}
        {p.badge && p.badge !== 'Sold Out' && <span className={`absolute top-3 right-3 px-3 py-1.5 rounded-full font-medium text-xs shadow-sm text-white ${p.badge === 'Promotion' ? 'bg-red-600' : p.badge === 'New' ? 'bg-blue-600' : 'bg-brand-green'}`}>{p.badge}</span>}
      </div>
      <div className="p-4 sm:p-5 flex flex-col flex-grow gap-2 pointer-events-none">
        <CardHeading className="font-bold text-gray-800 text-[18px] line-clamp-1 leading-snug">{p.project_name}</CardHeading>
        <div className="text-[13px] text-gray-500 flex items-center gap-1.5"><MapPin size={15} className="flex-shrink-0 text-gray-400" /><span className="truncate">{p.main_location || p.district}{p.sub_location || p.subdistrict ? ` - ${p.sub_location || p.subdistrict}` : ''}</span></div>
        <div className="flex items-end justify-between gap-3 mt-1">
          <span className="text-[22px] font-bold text-brand-green leading-none"><span className="text-[16px] mr-1">฿</span>{price.toLocaleString('th-TH')}</span>
          <span className="flex items-center gap-2.5 text-gray-500 text-[13px]">
            {p.area_wah && <span className="flex items-center gap-1" title="ตารางวา"><Maximize size={14} />{p.area_wah}</span>}
            {p.bedrooms && <span className="flex items-center gap-1" title="ห้องนอน"><Bed size={14} />{p.bedrooms}</span>}
            {p.bathrooms && <span className="flex items-center gap-1" title="ห้องน้ำ"><Bath size={14} />{p.bathrooms}</span>}
          </span>
        </div>
        {payment > 0 && <div className="mt-1 rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 bg-gradient-to-br from-[#123b2c] to-[#1d5a3f] ring-1 ring-inset ring-[#f3d27a]/25">
          <span className="text-[13px] text-white/85 leading-tight">ผ่อนเริ่มต้น<br /><span className="text-[11px] text-white/60">ประมาณการ*</span></span>
          <span className="text-right leading-none"><strong className="text-[24px] font-bold text-[#f3d27a]">{payment.toLocaleString('th-TH')}</strong><span className="text-[13px] text-white/85 ml-1">บาท/เดือน</span></span>
        </div>}
      </div>
    </a>
  );
}
