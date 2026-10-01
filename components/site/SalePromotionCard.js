import { useState } from 'react';
import { Gift } from 'lucide-react';
import { getOptimizedImg, SmartImage } from './SiteApp';

export default function SalePromotionCard({ promotion, onExpand }) {
  const [at, setAt] = useState(0);
  return <section className="sp4-promotion" tabIndex={-1} aria-label="โปรโมชั่นสำหรับบ้านหลังนี้">
    <h2><Gift size={18} aria-hidden="true" />{promotion.title}</h2>
    <button type="button" className="sp4-promotion-image" onClick={() => onExpand(promotion.images, at)} aria-label="ดูรูปโปรโมชั่นขนาดใหญ่">
      <SmartImage src={getOptimizedImg(promotion.images[at], 900)} alt={`${promotion.title} รูปที่ ${at + 1}`} loading="lazy" />
    </button>
    {promotion.images.length > 1 && <>
      <p className="sp4-promotion-count">รูปที่ {at + 1} จาก {promotion.images.length}</p>
      <div className="sp4-promotion-thumbs" aria-label="เลือกรูปโปรโมชั่น">
        {promotion.images.map((image, index) => <button type="button" key={image} aria-label={`ดูรูปโปรโมชั่นที่ ${index + 1}`}
          aria-pressed={at === index} onClick={() => setAt(index)}>
          <SmartImage src={getOptimizedImg(image, 160)} alt="" loading="lazy" />
        </button>)}
      </div>
    </>}
    {promotion.endDate && <p className="sp4-promotion-until">ถึง {new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(new Date(`${promotion.endDate}T12:00:00+07:00`))}</p>}
  </section>;
}
