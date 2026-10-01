import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { getOptimizedImg, preloadImage, SmartImage } from './SiteApp';

export default function SalePromotionCard({ promotion, onExpand }) {
  const [at, setAt] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const gallery = useRef(null);
  const count = promotion.images.length;
  const move = step => setAt(index => (index + step + count) % count);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(gallery.current);
    const onVisibility = () => setPageVisible(document.visibilityState !== 'hidden');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReducedMotion(motion.matches);
    onVisibility(); onMotion();
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
    };
  }, []);

  useEffect(() => {
    if (count < 2 || !visible || !pageVisible) return;
    preloadImage(promotion.images[(at + 1) % count], 900);
    if (reducedMotion) return;
    const timer = setTimeout(() => setAt(index => (index + 1) % count), 3000);
    return () => clearTimeout(timer);
  }, [at, count, reducedMotion, visible, pageVisible, promotion.images]);

  return <section className="sp4-promotion" tabIndex={-1} aria-label="โปรโมชั่นสำหรับบ้านหลังนี้">
    <h2><Gift size={18} aria-hidden="true" />{promotion.title}</h2>
    <div className="sp4-promotion-gallery" ref={gallery} role="group" aria-roledescription="สไลด์รูปภาพ" aria-label="รูปโปรโมชั่น">
      <button type="button" className="sp4-promotion-image" onClick={() => onExpand(promotion.images, at)} aria-label="ดูรูปโปรโมชั่นขนาดใหญ่">
        <SmartImage src={getOptimizedImg(promotion.images[at], 900)} alt={`${promotion.title} รูปที่ ${at + 1}`} loading="lazy" />
      </button>
      {count > 1 && <div className="sp4-promotion-navigation">
        <button type="button" className="sp4-promotion-control sp4-promotion-prev" onClick={() => move(-1)} aria-label="รูปโปรโมชั่นก่อนหน้า"><ChevronLeft size={24} aria-hidden="true" /></button>
        <span className="sp4-promotion-count" aria-live={reducedMotion ? 'polite' : 'off'} aria-atomic="true">{at + 1}/{count}</span>
        <button type="button" className="sp4-promotion-control sp4-promotion-next" onClick={() => move(1)} aria-label="รูปโปรโมชั่นถัดไป"><ChevronRight size={24} aria-hidden="true" /></button>
      </div>}
    </div>
    {promotion.endDate && <p className="sp4-promotion-until">ถึง {new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(new Date(`${promotion.endDate}T12:00:00+07:00`))}</p>}
  </section>;
}
