/**
 * SalePageV4 — หน้าบ้านรายหลัง ดีไซน์ใหม่สำหรับ /v4
 *
 * ไม่ได้แก้ SalePage เดิมเลยสักบรรทัด หน้าเว็บที่ / จึงไม่ขยับ
 * ตรรกะทั้งหมด (บ้านใกล้เคียง รูป วิดีโอ คำนวณสินเชื่อ) ใช้ของเดิมจาก SiteApp
 * ต่างกันแค่เปลือกนอกกับจังหวะการแสดงผล
 *
 * สิ่งที่ต่างจากของเดิม
 *   ชื่อบ้าน      ขึ้นก่อนรูป พร้อมชิปบ้านเลขที่ / ซอย / ทำเล
 *   รูป          ไม่ครอบ (contain) เปลี่ยนรูปแบบกวาดตามทิศที่กด
 *   สเปก         ไอคอนบน ตัวเลขกลาง ป้ายล่าง บนแผ่นเขียว CI
 *   ทิศบ้าน       เข็มทิศหมุนจริง + สรุปว่ารับแดดเช้าหรือบ่าย
 *   รายละเอียด    บรรทัดที่ขึ้นต้นด้วย - กลายเป็นรายการจุดกลม
 *   ฟอนต์         Prompt ล้วน ชุดเดียวกับฉากเปิด
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lineContactHref } from '../../lib/lineAttribution';
import {
  ChevronLeft, ChevronRight, MapPin, Phone, Calendar, Gift,
} from 'lucide-react';

import {
  SmartImage, SoldOutRibbon, CalculatorSection, db, appId,
  getOptimizedImg, preloadImage, preloadImagesAround,
  getYoutubeId, getPropertySharePath,
} from './SiteApp';
import SalePromotionCard from './SalePromotionCard';
import useSalePromotion from './useSalePromotion';
import { promotionAppliesTo } from '../../lib/salePromotion';

/** ทิศไทย -> องศาเข็มทิศ และคำอธิบายแดดที่คนซื้อบ้านถามจริง */
const DIR_DEG = {
  'เหนือ': 0, 'ตะวันออกเฉียงเหนือ': 45, 'ตะวันออก': 90, 'ตะวันออกเฉียงใต้': 135,
  'ใต้': 180, 'ตะวันตกเฉียงใต้': 225, 'ตะวันตก': 270, 'ตะวันตกเฉียงเหนือ': 315,
};
const DIR_SUN = {
  0: 'ไม่โดนแดดตรง เย็นทั้งวัน',
  45: 'รับแดดเช้าเฉียง บ่ายไม่ร้อน',
  90: 'รับแดดเช้า บ่ายไม่ร้อน',
  135: 'รับแดดเช้าถึงเที่ยง',
  180: 'รับแดดเที่ยง สว่างทั้งวัน',
  225: 'รับแดดบ่าย ควรมีกันสาด',
  270: 'รับแดดบ่ายเต็ม ร้อนช่วงเย็น',
  315: 'รับแดดบ่ายเฉียง เช้าไม่ร้อน',
};

const THAI_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const PAD2 = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => PAD2(i));      // 00 - 23 ไม่ใช้ AM/PM
const MINUTES = Array.from({ length: 60 }, (_, i) => PAD2(i));    // 00 - 59

const SAVED_KEY = 'startupup:saved';
const readSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (e) { return []; }
};
const writeSaved = (list) => {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) { /* โหมดส่วนตัวเขียนไม่ได้ ไม่เป็นไร */ }
};

/**
 * ส่ง event ผ่านคิว gtag ใน pages/_app.js ไปยัง GA4 ที่ตั้งค่าผ่าน GTM
 * นับอย่างเดียว ไม่เก็บอะไรที่ระบุตัวบุคคล
 * ห่อ try ไว้เพราะผู้ใช้บางคนมีตัวบล็อกโฆษณาที่ทำให้ gtag ไม่มีอยู่จริง
 * ถ้าไม่ห่อ ปุ่มจะกดไม่ทำงานเลยเมื่อสคริปต์ถูกบล็อก
 */
const track = (name, params) => {
  if (typeof window === 'undefined') return;
  try { window.gtag?.('event', name, params); } catch (e) { /* ไม่มี gtag ก็ปล่อยผ่าน */ }
};

const baht = (v) => Number(String(v || 0).replace(/,/g, '')).toLocaleString();

/** แปลงข้อความ highlights ที่เก็บ "-" นำหน้า ให้เป็นย่อหน้ากับรายการจุดกลม */
function parseHighlights(text) {
  const out = [];
  String(text || '').split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) { out.push(null); return; }
    const m = line.match(/^[-•*–]\s*(.+)$/);
    if (m) {
      const last = out[out.length - 1];
      if (last && last.type === 'list') last.items.push(m[1]);
      else out.push({ type: 'list', items: [m[1]] });
    } else {
      out.push({ type: 'text', text: line });
    }
  });
  return out.filter(Boolean);
}

function SunDial({ deg }) {
  return (
    <svg className="sp4-dial" viewBox="0 0 80 80" role="img" aria-label={`ทิศที่หน้าบ้านหัน ${deg} องศา`}>
      <circle className="ring" cx="40" cy="40" r="33" fill="none" strokeWidth="1" />
      <path className="arc" d="M 40 12 A 28 28 0 0 1 40 68" fill="none" strokeWidth="1.2" />
      <line className="tick" x1="40" y1="3" x2="40" y2="9" strokeWidth="1.6" strokeLinecap="round" />
      <line className="tick" x1="77" y1="40" x2="71" y2="40" strokeWidth="1" strokeLinecap="round" />
      <line className="tick" x1="40" y1="77" x2="40" y2="71" strokeWidth="1" strokeLinecap="round" />
      <line className="tick" x1="3" y1="40" x2="9" y2="40" strokeWidth="1" strokeLinecap="round" />
      <circle className="house" cx="40" cy="40" r="7" />
      <polygon className="needle" points="40,15 44,42 40,38.5 36,42" style={{ transform: `rotate(${deg}deg)` }} />
      <g className="sun-orbit">
        <circle className="sun-glow" cx="40" cy="12" r="6" />
        <circle className="sun" cx="40" cy="12" r="3" />
      </g>
    </svg>
  );
}

export default function SalePageV4({
  property, companyInfo, onBack, properties, onSelectProp,
  visualContent, updateVisualContent, isEditMode, openLightbox,
}) {
  const { promotion, now } = useSalePromotion(db, appId);
  const showPromotion = promotionAppliesTo(promotion, property, now);
  const jumpToPromotion = () => {
    const target = [...document.querySelectorAll('.sp4-promotion')].find(node => node.getClientRects().length);
    if (!target) return;
    target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    target.focus({ preventScroll: true });
  };
  const [at, setAt] = useState(0);
  const [wipe, setWipe] = useState(null);       // { src, dir } ระหว่างเล่นจังหวะกวาด
  const [videoOn, setVideoOn] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [pickDate, setPickDate] = useState(null);   // Date ที่ลูกค้าเลือก
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [calY, setCalY] = useState(() => new Date().getFullYear());
  const [calM, setCalM] = useState(() => new Date().getMonth());

  const railRef = useRef(null);
  const wipeTimer = useRef(null);
  const toastTimer = useRef(null);

  const images = useMemo(() => (
    Array.isArray(property?.images) && property.images.length > 0
      ? property.images
      : [property?.imageUrl || 'https://placehold.co/1200x800']
  ), [property]);

  const youtubeId = getYoutubeId(property?.youtubeUrl || '');
  const propId = property?.id || '';
  const isSaved = saved.indexOf(propId) !== -1;

  const dirDeg = DIR_DEG[String(property?.direction || '').trim()];
  const hasDir = typeof dirDeg === 'number';

  useEffect(() => { setSaved(readSaved()); }, []);

  useEffect(() => {
    setAt(0); setWipe(null); setVideoOn(false); setHeroReady(false);
    setBookOpen(false); setPickDate(null); setHour(''); setMinute('');
  }, [property?.id]);

  useEffect(() => { preloadImagesAround(images, at, 1400, 1); }, [images, at]);

  useEffect(() => () => {
    clearTimeout(wipeTimer.current);
    clearTimeout(toastTimer.current);
  }, []);

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  /**
   * เปลี่ยนรูปแบบกวาดตามทิศ
   * ภาพใหม่ถูกวางทับภาพเดิมแล้วเผยจากด้านที่กด ไม่ใช่จางสลับ
   * ระหว่างเล่นล็อกไว้ ไม่ให้กดซ้อนจนภาพค้างผิดเฟรม
   */
  const goTo = useCallback((next, dir) => {
    const n = (next + images.length) % images.length;
    if (n === at || wipe) return;
    preloadImage(images[n], 1400);
    setWipe({ src: images[n], dir });
    clearTimeout(wipeTimer.current);
    wipeTimer.current = setTimeout(() => { setAt(n); setWipe(null); }, 620);
  }, [at, images, wipe]);

  const toggleSave = useCallback((id) => {
    const list = readSaved();
    const i = list.indexOf(id);
    const on = i === -1;
    if (on) list.push(id); else list.splice(i, 1);
    writeSaved(list);
    setSaved(list.slice());
    say(on ? 'บันทึกไว้แล้ว ดูได้ในเครื่องนี้' : 'เอาออกจากรายการที่บันทึกแล้ว');
  }, [say]);

  const relatedProps = useMemo(() => {
    const name = String(property?.project_name || '').trim();
    const subDist = String(property?.subdistrict || '').trim();
    const subLoc = String(property?.sub_location || '').trim();
    const dist = String(property?.district || '').trim();
    const mainLoc = String(property?.main_location || '').trim();
    return (properties || [])
      .filter((p) => p && p.id && p.id !== property?.id)
      .map((p) => {
        let score = 0;
        const pName = String(p.project_name || '').trim();
        if (pName && name && pName === name) score += 1000;
        if (String(p.subdistrict) === subDist || String(p.sub_location) === subLoc) score += 100;
        if (String(p.district) === dist || String(p.main_location) === mainLoc) score += 50;
        if (p.category === property?.category) score += 10;
        const diff = Math.abs(
          (Number(String(p.price || 0).replace(/,/g, '')) || 0)
          - (Number(String(property?.price || 0).replace(/,/g, '')) || 0),
        );
        return { ...p, relevanceScore: score, priceDiff: diff };
      })
      .sort((a, b) => (b.relevanceScore !== a.relevanceScore
        ? b.relevanceScore - a.relevanceScore
        : a.priceDiff - b.priceDiff))
      .slice(0, 8);
  }, [properties, property]);

  const houseAndSoi = useMemo(() => {
    const hn = String(property?.house_number || '').trim();
    const soi = String(property?.soi || '').trim();
    let soiText = '';
    if (soi) soiText = /^ซ(อย)?[.\s]|^Soi/i.test(soi) ? soi : `ซอย ${soi}`;
    return { hn, soi: soiText };
  }, [property]);

  /**
   * ตารางวันของเดือนที่กำลังดู
   * เติมช่องว่างหน้าวันที่ 1 ให้ตรงคอลัมน์วันในสัปดาห์
   * วันที่ผ่านมาแล้วกดไม่ได้ เพราะนัดย้อนหลังไม่มีความหมาย
   */
  const calCells = useMemo(() => {
    const first = new Date(calY, calM, 1);
    const lead = first.getDay();
    const total = new Date(calY, calM + 1, 0).getDate();
    const cells = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) {
      const date = new Date(calY, calM, d);
      cells.push({ d, date, past: date < today });
    }
    return cells;
  }, [calY, calM, today]);

  const shiftMonth = useCallback((step) => {
    const m = calM + step;
    setCalY(calY + Math.floor(m / 12));
    setCalM((m % 12 + 12) % 12);
  }, [calY, calM]);

  const thaiDate = useCallback((d) => {
    if (!d) return '';
    const DOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return `วัน${DOW[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
  }, []);

  const bookReady = Boolean(pickDate && hour !== '' && minute !== '');

  const trackContact = useCallback((name) => {
    track(name, {
      property_id: property?.id || '',
      property_name: property?.project_name || '',
    });
  }, [property]);

  const sendBooking = useCallback(() => {
    trackContact('booking_line_send');
    const msg = [
      'สนใจนัดเข้าชมบ้าน',
      property?.project_name || '',
      houseAndSoi.hn ? `บ้านเลขที่ ${houseAndSoi.hn}` : '',
      `${thaiDate(pickDate)} เวลา ${hour}:${minute} น.`,
      `https://www.startupup-real-estate.com${getPropertySharePath(property)}`,
    ].filter(Boolean).join('\n');
    /**
     * ต้องมี noreferrer ไม่ใช่แค่ noopener
     *
     * เว็บตั้ง Referrer-Policy เป็น strict-origin-when-cross-origin ไว้
     * เวลาเปิดลิงก์ข้ามโดเมน เบราว์เซอร์จึงส่งแค่ชื่อโดเมนไปให้ปลายทาง
     * LINE เอาค่านั้นมาต่อท้ายข้อความให้เอง กลายเป็นลิงก์หน้าหลักโผล่มาอีกอัน
     * ปิดการส่ง referrer ทิ้ง LINE ก็ไม่มีอะไรให้ต่อท้าย เหลือลิงก์บ้านหลังเดียว
     */
    window.open(lineContactHref(property, msg), '_blank', 'noopener,noreferrer');
  }, [property, houseAndSoi, pickDate, hour, minute, thaiDate, trackContact]);

  // ลูกศรซ้าย-ขวาบนคีย์บอร์ดเลื่อนรูปได้
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goTo(at - 1, -1);
      else if (e.key === 'ArrowRight') goTo(at + 1, 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, goTo]);

  if (!property) return null;

  const blocks = parseHighlights(property.highlights);
  const badge = property.badge;
  const hasMap = property.lat && property.lng
    && String(property.lat).trim() !== '' && String(property.lng).trim() !== '';

  return (
    <div className="sp4">
      {/* ── แถวควบคุมบนสุด ── */}
      <div className="sp4-topline">
        <button type="button" className="sp4-back" onClick={onBack}>
          <ChevronLeft size={14} /> ย้อนกลับ
        </button>
        <div className="sp4-tools">
          <button
            type="button"
            className={`sp4-fav${isSaved ? ' is-on' : ''}`}
            aria-pressed={isSaved}
            onClick={() => !isEditMode && toggleSave(propId)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            {isSaved ? 'บันทึกแล้ว' : 'บันทึก'}
          </button>
          <button
            type="button"
            className="sp4-share"
            onClick={() => {
              const url = `https://www.startupup-real-estate.com${getPropertySharePath(property)}`;
              navigator.clipboard?.writeText(url);
              say('คัดลอกลิงก์เรียบร้อยแล้ว');
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            คัดลอกลิงก์
          </button>
        </div>
      </div>

      {/* ── ชื่อบ้าน อยู่ก่อนรูปเหมือน SalePage เดิม ── */}
      <div className="sp4-masthead reveal-on-scroll">
        {property.category && <p className="sp4-eyebrow">{property.category}</p>}
        <p className="sp4-title-key">ชื่อโครงการ</p>
        <h1 className="sp4-title">{property.project_name}</h1>
        <div className="sp4-idents">
          {houseAndSoi.hn && (
            <span className="sp4-ident">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              บ้านเลขที่ <b>{houseAndSoi.hn}</b>
            </span>
          )}
          {houseAndSoi.soi && (
            <span className="sp4-ident">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5" /><path d="M20 19V5" /><path d="M4 12h16" /></svg>
              <b>{houseAndSoi.soi}</b>
            </span>
          )}
          <span className="sp4-ident is-loc">
            <MapPin size={15} />
            <b>
              {property.main_location || property.district}
              {(property.sub_location || property.subdistrict) ? ` — ${property.sub_location || property.subdistrict}` : ''}
            </b>
          </span>
        </div>
      </div>

      {/* ── ภาพหลัก แถบเต็มความกว้าง รูปไม่ถูกครอบ ── */}
      <figure className="sp4-stage">
        <div className="sp4-shot">
          {!heroReady && <div className="sp4-skel sp4-skel-hero" aria-hidden="true" />}
          <SmartImage
            src={getOptimizedImg(images[at], 1400)}
            alt={property.project_name}
            width={1400} height={900}
            sizes="100vw"
            priority
            decoding="async"
            className="sp4-hero"
            style={heroReady ? undefined : { visibility: 'hidden' }}
            onLoad={() => setHeroReady(true)}
            onError={() => setHeroReady(true)}
            onClick={() => openLightbox && openLightbox(images, at)}
          />

          {wipe && (
            <div className={`sp4-layer${wipe.dir < 0 ? ' is-back' : ''}`} aria-hidden="true">
              <img src={getOptimizedImg(wipe.src, 1400)} alt="" />
            </div>
          )}

          {badge === 'Sold Out'
            ? <SoldOutRibbon size="lg" />
            : badge && <span className="sp4-flag">{badge === 'Promotion' ? 'โปรโมชั่น' : badge === 'New' ? 'มาใหม่' : badge}</span>}

          <span className="sp4-counter">{at + 1} / {images.length}</span>

          {images.length > 1 && (
            <>
              <button type="button" className="sp4-nav prev" aria-label="รูปก่อนหน้า" onClick={() => goTo(at - 1, -1)}>
                <ChevronLeft size={20} />
              </button>
              <button type="button" className="sp4-nav next" aria-label="รูปถัดไป" onClick={() => goTo(at + 1, 1)}>
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </figure>

      {images.length > 1 && (
        <div className="sp4-strip">
          {images.map((img, i) => (
            <button
              key={i} type="button" aria-current={i === at}
              onMouseEnter={() => preloadImage(img, 1400)}
              onClick={() => goTo(i, i > at ? 1 : -1)}
            >
              <SmartImage src={getOptimizedImg(img, 260)} alt={`รูปที่ ${i + 1}`} width={130} height={90} sizes="92px" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {/* ── เนื้อหาสองคอลัมน์ ── */}
      <main className="sp4-record">
        <div>
          <div className="sp4-price-block reveal-on-scroll">
            <p className="sp4-price-key">ราคาขาย</p>
            <p className="sp4-price">฿ {baht(property.price)}</p>
            {showPromotion && <button type="button" className="sp4-promotion-link" onClick={jumpToPromotion}>
              <Gift size={17} aria-hidden="true" /> {promotion.title} · ดูสิทธิพิเศษ
            </button>}
          </div>

          <div className="sp4-plate reveal-on-scroll">
            <div className="sp4-specs">
              <div className="sp4-spec">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                <b>{property.area_wah || '-'}</b><span>ตร.ว.</span>
              </div>
              <div className="sp4-spec">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>
                <b>{property.bedrooms || '-'}</b><span>ห้องนอน</span>
              </div>
              <div className="sp4-spec">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-3 1V17a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5H2" /><line x1="6" y1="19" x2="5" y2="21" /><line x1="18" y1="19" x2="19" y2="21" /></svg>
                <b>{property.bathrooms || '-'}</b><span>ห้องน้ำ</span>
              </div>
              <div className="sp4-spec">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14v-5l-2-5H7l-2 5v5z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /></svg>
                <b>{property.parking || '-'}</b><span>ที่จอดรถ</span>
              </div>
            </div>

            {/* แถวทิศ โผล่เฉพาะหลังที่กรอกทิศไว้จริง ไม่งั้นจะเป็นช่องว่างเปล่า */}
            {hasDir && (
              <div className="sp4-sunrow">
                <span className="sp4-sun-read">
                  <span className="sp4-sun-dir">{property.direction}</span>
                  <span className="sp4-sun-note">หน้าบ้าน{DIR_SUN[dirDeg]}</span>
                </span>
                <SunDial deg={dirDeg} />
              </div>
            )}
          </div>

          {showPromotion && <div className="sp4-promotion-mobile">
            <SalePromotionCard key={promotion.images.join('|')} promotion={promotion} onExpand={openLightbox} />
          </div>}

          {blocks.length > 0 && (
            <section className="sp4-block reveal-on-scroll">
              <h2>รายละเอียด</h2>
              <div className="sp4-hl">
                {blocks.map((b, i) => (b.type === 'list' ? (
                  <ul className="sp4-hl-list" key={i}>
                    {b.items.map((it, k) => <li key={k}><span>{it}</span></li>)}
                  </ul>
                ) : (
                  <p key={i}>{b.text}</p>
                )))}
              </div>
            </section>
          )}

          {Array.isArray(property.facilitiesList) && property.facilitiesList.length > 0 && (
            <section className="sp4-block reveal-on-scroll">
              <h2>สิ่งอำนวยความสะดวก</h2>
              <div className="sp4-tags">
                {property.facilitiesList.map((f, i) => <span key={i}>{f}</span>)}
              </div>
            </section>
          )}

          {youtubeId && (
            <section className="sp4-block reveal-on-scroll">
              <h2>วิดีโอแนะนำ</h2>
              <div className="sp4-video">
                {!videoOn ? (
                  <button type="button" className="sp4-video-cover" onClick={() => setVideoOn(true)}>
                    <SmartImage
                      src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                      alt="ภาพปกวิดีโอแนะนำบ้าน" width={1280} height={720} sizes="(max-width: 960px) 100vw, 700px"
                      loading="lazy" decoding="async"
                      onError={(e) => { e.target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`; }}
                    />
                    <span className="sp4-play"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
                  </button>
                ) : (
                  <iframe
                    width="100%" height="100%" title="วิดีโอแนะนำบ้าน" frameBorder="0"
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>
            </section>
          )}

          {hasMap && (
            <section className="sp4-block reveal-on-scroll">
              <h2>ที่ตั้งโครงการ</h2>
              <div className="sp4-map">
                <iframe
                  title="แผนที่ที่ตั้งโครงการ" width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.lat},${property.lng}`)}&hl=th&z=16&output=embed`}
                  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                className={`sp4-mapbtn${isEditMode ? ' is-off' : ''}`}
                href={isEditMode ? '#' : `https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}`}
                target={isEditMode ? '_self' : '_blank'} rel="noopener noreferrer"
              >
                <MapPin size={16} /> เปิดนำทางด้วย Google Maps
              </a>
            </section>
          )}
        </div>

        {/* ── รางติดต่อ ── */}
        <aside className="sp4-rail reveal-on-scroll">
          <div className="sp4-card">
            <h2>สนใจติดต่อ</h2>
            <div className="sp4-acts">
              <a
                className={`sp4-act call${isEditMode ? ' is-off' : ''}`}
                href={isEditMode ? '#' : `tel:${companyInfo?.phone}`}
                onClick={() => trackContact('contact_call')}
              >
                <Phone size={16} /> {companyInfo?.phone}
              </a>
              <a
                className={`sp4-act line${isEditMode ? ' is-off' : ''}`}
                href={isEditMode ? '#' : lineContactHref(property)}
                target="_blank" rel="noopener noreferrer"
                onClick={() => trackContact('contact_line')}
              >
                <img src="/brand/line.png" alt="" width="18" height="18" className="sp4-lineico" /> ทักไลน์
              </a>
              <button type="button" className="sp4-act line" aria-expanded={bookOpen} onClick={() => setBookOpen((v) => !v)}>
                <Calendar size={16} /> นัดเข้าชมบ้าน
              </button>
            </div>

            <div className={`sp4-book${bookOpen ? ' is-open' : ''}`}>
              <div className="sp4-book-in">
                <div className="sp4-calhead">
                  <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button>
                  <div className="sp4-calsel">
                    <select value={calM} onChange={(e) => setCalM(Number(e.target.value))} aria-label="เลือกเดือน">
                      {THAI_MONTH.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={calY} onChange={(e) => setCalY(Number(e.target.value))} aria-label="เลือกปี">
                      {[0, 1, 2].map((k) => {
                        const y = today.getFullYear() + k;
                        return <option key={y} value={y}>{y + 543}</option>;
                      })}
                    </select>
                  </div>
                  <button type="button" aria-label="เดือนถัดไป" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button>
                </div>

                <div className="sp4-cal">
                  {THAI_DOW.map((d) => <span key={d} className="sp4-dow">{d}</span>)}
                  {calCells.map((c, i) => (c ? (
                    <button
                      key={c.d} type="button" className="sp4-day"
                      disabled={c.past}
                      aria-pressed={Boolean(pickDate) && pickDate.getTime() === c.date.getTime()}
                      onClick={() => setPickDate(c.date)}
                    >
                      {c.d}
                    </button>
                  ) : <span key={`b${i}`} />))}
                </div>

                <h4 style={{ marginTop: 16 }}>เลือกเวลา</h4>
                <div className="sp4-time">
                  <select value={hour} onChange={(e) => setHour(e.target.value)} aria-label="เลือกชั่วโมง">
                    <option value="">ชม.</option>
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <b>:</b>
                  <select value={minute} onChange={(e) => setMinute(e.target.value)} aria-label="เลือกนาที">
                    <option value="">นาที</option>
                    {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span className="sp4-time-unit">น.</span>
                </div>

                {bookReady && (
                  <p className="sp4-book-sum">{thaiDate(pickDate)} เวลา {hour}:{minute} น.</p>
                )}

                <button type="button" className="sp4-book-send" disabled={!bookReady || isEditMode} onClick={sendBooking}>
                  <img src="/brand/line.png" alt="" width="18" height="18" className="sp4-lineico" />
                  ส่งนัดผ่านไลน์
                </button>
              </div>
            </div>

          </div>
          {showPromotion && <div className="sp4-promotion-desktop">
            <SalePromotionCard key={promotion.images.join('|')} promotion={promotion} onExpand={openLightbox} />
          </div>}
          <div className="sp4-card sp4-calculator-card">
            <div className="sp4-calc">
              <h3>คำนวณสินเชื่อ</h3>
              <CalculatorSection
                defaultPrice={property.price} minimalist
                visualContent={visualContent} updateVisualContent={updateVisualContent} isEditMode={isEditMode}
              />
            </div>
          </div>
        </aside>
      </main>

      {/* ── โครงการที่คุณอาจสนใจ ── */}
      {relatedProps.length > 0 && (
        <section className="sp4-related reveal-on-scroll">
          <div className="sp4-related-head">
            <h2>โครงการที่คุณอาจสนใจ</h2>
            <div className="sp4-railnav">
              <button type="button" aria-label="เลื่อนไปทางซ้าย" onClick={() => railRef.current?.scrollBy({ left: -256, behavior: 'smooth' })}><ChevronLeft size={16} /></button>
              <button type="button" aria-label="เลื่อนไปทางขวา" onClick={() => railRef.current?.scrollBy({ left: 256, behavior: 'smooth' })}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="sp4-railx" ref={railRef}>
            {relatedProps.map((p) => (
              <div className="sp4-cardwrap" key={p.id}>
                <a
                  className="sp4-pcard" href={getPropertySharePath(p)}
                  onClick={(e) => { if (!e.ctrlKey && !e.metaKey && !e.button) { e.preventDefault(); if (!isEditMode) onSelectProp(p); } }}
                >
                  <div className="sp4-pcard-img">
                    <SmartImage src={getOptimizedImg(p.images?.[0] || p.imageUrl, 440)} alt={p.project_name} width={440} height={330} sizes="232px" loading="lazy" decoding="async" />
                    {p.badge === 'Sold Out' && <SoldOutRibbon size="sm" />}
                  </div>
                  <h3>{p.project_name}</h3>
                  <div className="sp4-pcard-loc">{p.main_location || p.district}</div>
                  <div className="sp4-pcard-amt">฿ {baht(p.price)}</div>
                </a>
                <button
                  type="button" className={`sp4-cardfav${saved.indexOf(p.id) !== -1 ? ' is-on' : ''}`}
                  aria-pressed={saved.indexOf(p.id) !== -1} aria-label="บันทึกบ้านนี้"
                  onClick={() => !isEditMode && toggleSave(p.id)}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {toast && <div className="sp4-toast" role="status">{toast}</div>}

      <style>{css}</style>
    </div>
  );
}

const css = `
.sp4 {
  /* ชุดสีเดียวกับเว็บที่ live อยู่ — ขาว/เทาอ่อน + เขียวแบรนด์
     เทียบมาจากคลาสที่ SalePage เดิมใช้จริง (bg-gray-50, bg-white,
     border-gray-100, text-gray-400/500/600/800, text-brand-green)
     และ brand.green / brand.light ใน tailwind.config.js */
  --paper: #f8fafc;          /* พื้นหน้า = bg-gray-50 */
  --paper-soft: #f1f5f9;     /* แถบภาพ */
  --card: #ffffff;           /* การ์ด = bg-white */
  --ink: #1f2937;            /* text-gray-800 */
  --ink-soft: #4b5563;       /* text-gray-600 */
  --ink-faint: #9ca3af;      /* text-gray-400 */
  --line: #f3f4f6;           /* border-gray-100 */
  --line-firm: #e5e7eb;      /* border-gray-200 */
  --line-green: rgba(11, 61, 27, .30);   /* เส้นขอบชิปทุกชนิด ใช้เขียว CI */
  --forest: #0b3d1b;         /* brand.green */
  --brand-light: #eef3f0;    /* brand.light */
  --sun: #d97706;            /* ใช้จุดเดียว: ดวงอาทิตย์บนหน้าปัดทิศ */
  --shadow: 0 1px 2px rgba(15, 23, 42, .06), 0 8px 24px rgba(15, 23, 42, .05);
  --s1: 8px; --s2: 16px; --s3: 24px; --s4: 40px; --s5: 64px; --s6: 96px;
  --r1: 8px; --r2: 16px; --r3: 24px; --r4: 999px;
  --shell: 1200px; --gutter: 32px;
  background: var(--paper); color: var(--ink);
  font-weight: 300; line-height: 1.75;
  container-type: inline-size;
  position: relative; overflow: hidden;
}

.sp4 * { box-sizing: border-box; }
.sp4 :focus-visible { outline: 2px solid var(--forest); outline-offset: 3px; border-radius: var(--r1); }

.sp4-topline {
  max-width: var(--shell); margin: 0 auto; padding: var(--s3) var(--gutter);
  display: flex; align-items: center; justify-content: space-between; gap: var(--s2);
}
.sp4-tools { display: flex; gap: 10px; align-items: center; }
.sp4-back, .sp4-share, .sp4-fav {
  display: inline-flex; align-items: center; gap: var(--s1);
  font: inherit; font-size: 13px; letter-spacing: 0.02em; cursor: pointer;
  background: none; border-radius: var(--r4); transition: color .2s, border-color .2s, background .2s, transform .2s;
}
.sp4-back { border: 0; padding: 0; color: var(--ink-faint); }
.sp4-back:hover { color: var(--forest); transform: translateX(-4px); }
.sp4-share { border: 1px solid var(--line); padding: var(--s1) 18px; color: var(--forest); }
.sp4-share:hover { background: rgba(11,61,27,.06); border-color: rgba(11,61,27,.28); }
.sp4-fav { border: 1px solid var(--line); padding: var(--s1) 16px; color: var(--ink-soft); }
.sp4-fav svg { fill: none; stroke: currentColor; stroke-width: 1.8; transition: fill .24s; }
.sp4-fav:hover { color: #b8384a; border-color: rgba(184,56,74,.35); }
.sp4-fav.is-on { color: #b8384a; border-color: rgba(184,56,74,.4); background: rgba(184,56,74,.07); }
.sp4-fav.is-on svg { fill: #b8384a; }

.sp4-masthead { max-width: var(--shell); margin: 0 auto; padding: 0 var(--gutter) var(--s3); }
.sp4-eyebrow {
  margin: 0 0 var(--s2); display: inline-block;
  border: 1px solid var(--line-green); border-radius: var(--r4); padding: 5px 14px;
  font-size: 12px; font-weight: 500; letter-spacing: .02em; color: var(--forest);
}
/* หัวข้อกำกับ ใช้สเปกเดียวกับ "ราคาขาย" เพื่อให้สองหัวข้อหลักของหน้าอ่านเป็นชุดเดียวกัน */
.sp4-title-key {
  margin: 0 0 4px; font-size: 16px; font-weight: 500; color: var(--forest);
}
.sp4-title {
  margin: 0; font-size: clamp(23px, 4.2cqw, 56px); font-weight: 300;
  line-height: 1.2; letter-spacing: -.002em; text-wrap: balance; color: var(--ink);
}
.sp4-idents { margin: var(--s3) 0 0; display: flex; flex-wrap: wrap; gap: var(--s1) 10px; }
.sp4-ident {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px;
  border-radius: var(--r4); border: 1px solid var(--line-green); background: var(--card);
  font-size: 14px; color: var(--ink-soft);
}
.sp4-ident b { font-weight: 500; color: var(--ink); }
.sp4-ident svg { color: var(--forest); flex: 0 0 auto; }
.sp4-ident.is-loc b { color: var(--forest); font-weight: 500; }

.sp4-stage {
  width: 100%; margin: 0; background: var(--paper-soft);
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  display: flex; justify-content: center;
}
/**
 * overflow: hidden ขาดไม่ได้
 * ป้าย SOLD OUT วางแบบเลยขอบขวาออกไป 48px แล้วหมุน 38 องศา
 * ตั้งใจให้โดนขลิบที่มุมภาพจนกลายเป็นแถบเฉียงพาดมุม
 * ถ้ากล่องไม่ขลิบ ป้ายจะโผล่พ้นภาพขึ้นไปลอยทับแถบเมนูด้านบน
 * (การ์ดบ้านใบเล็กขลิบอยู่แล้ว จึงไม่เคยมีปัญหานี้)
 */
.sp4-shot { position: relative; display: flex; max-width: 100%; overflow: hidden; }
.sp4-shot .sp4-hero {
  width: auto; max-width: 100%; max-height: 74vh; object-fit: contain;
  display: block; cursor: zoom-in;
}

/* เปลี่ยนรูปแบบกวาดตามทิศ — ภาพใหม่เผยทับภาพเดิมจากด้านที่กด
   กำหนดทั้ง from และ to ชัดเจน ไม่ปล่อยให้เบราว์เซอร์เดาจุดเริ่มเอง
   ไม่งั้นบางเบราว์เซอร์จะ interpolate ข้ามชนิดรูปทรงแล้วออกมาเป็นวงรี */
.sp4-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.sp4-layer img { width: 100%; height: 100%; object-fit: contain; display: block;
  animation: sp4wipe 620ms cubic-bezier(.65,0,.35,1) forwards; }
.sp4-layer.is-back img { animation-name: sp4wipeBack; }
@keyframes sp4wipe     { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
@keyframes sp4wipeBack { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }

.sp4-counter, .sp4-flag {
  position: absolute; border-radius: var(--r4); letter-spacing: .12em;
  backdrop-filter: blur(8px); z-index: 3;
}
.sp4-counter { right: 14px; bottom: 14px; font-size: 11px; color: #fff; background: rgba(17,24,39,.62); padding: 6px 14px; }
.sp4-flag { left: 14px; top: 14px; font-size: 10px; color: #fff; background: var(--forest); padding: 6px 15px; }

.sp4-nav {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 3;
  width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
  border: 0; border-radius: var(--r4); cursor: pointer;
  background: rgba(255,255,255,.92); color: var(--forest);
  backdrop-filter: blur(8px); box-shadow: 0 4px 16px rgba(11,31,18,.22);
  transition: background .2s, transform .2s;
}
.sp4-nav:hover { background: #fff; transform: translateY(-50%) scale(1.06); }
.sp4-nav.prev { left: 14px; } .sp4-nav.next { right: 14px; }

/* ── โครงร่างระหว่างโหลด ──
   ใช้ background-position ขยับแทน transform เพราะต้องกวาดแถบไล่สี
   ไม่ได้ย้ายทั้งกล่อง จึงไม่ทำให้เกิด layout shift */
.sp4-skel {
  background: linear-gradient(100deg, #eef1f5 30%, #f7f9fb 48%, #eef1f5 66%);
  background-size: 320% 100%;
  animation: sp4shimmer 1.4s ease-in-out infinite;
  border-radius: var(--r1);
}
@keyframes sp4shimmer { from { background-position: 130% 0; } to { background-position: -30% 0; } }
.sp4-skel-hero {
  position: absolute; inset: 0; z-index: 2; border-radius: 0;
}
/* กันไม่ให้กรอบรูปยุบเหลือศูนย์ตอนยังไม่มีภาพ ไม่งั้นหน้าจะกระตุกตอนโหลดเสร็จ */
.sp4-shot { min-height: clamp(220px, 42vh, 520px); min-width: min(100%, 900px); }

.sp4-strip {
  max-width: var(--shell); margin: 0 auto; padding: var(--s2) var(--gutter) 0;
  display: flex; gap: var(--s1); overflow-x: auto;
  scrollbar-width: none; -ms-overflow-style: none;
}
.sp4-strip::-webkit-scrollbar { width: 0; height: 0; display: none; }
.sp4-strip button {
  flex: 0 0 auto; width: 92px; height: 62px; padding: 0; border: 0; border-radius: var(--r1);
  overflow: hidden; cursor: pointer; background: none; opacity: .5;
  transition: opacity .28s, box-shadow .28s, transform .28s;
}
.sp4-strip button img { width: 100%; height: 100%; object-fit: cover; }
.sp4-strip button:hover { opacity: .85; transform: translateY(-2px); }
.sp4-strip button[aria-current="true"] { opacity: 1; box-shadow: 0 0 0 2px var(--forest); }

.sp4-record {
  max-width: var(--shell); margin: 0 auto; padding: var(--s5) var(--gutter) 0;
  display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: var(--s6); align-items: start;
}
@container (max-width: 960px) {
  .sp4-record { grid-template-columns: minmax(0,1fr); gap: var(--s5); padding-top: var(--s4); }
}

.sp4-price-block { padding-bottom: var(--s3); border-bottom: 1px solid var(--line); }
.sp4-price-key { margin: 0 0 6px; font-size: 16px; font-weight: 500; color: var(--forest); }
.sp4-price {
  margin: 0; font-size: clamp(30px, 4.2vw, 42px); font-weight: 600; line-height: 1;
  color: var(--forest); letter-spacing: -.02em;
}

.sp4-plate {
  margin: var(--s4) 0 0; border-radius: var(--r2); overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line); box-shadow: var(--shadow);
}
.sp4-specs { display: grid; grid-template-columns: repeat(4,1fr); }
.sp4-spec {
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  padding: var(--s3) 8px; text-align: center; border-left: 1px solid var(--line);
}
.sp4-spec:first-child { border-left: 0; }
.sp4-spec svg { color: var(--forest); stroke-width: 1.3; opacity: .85; }
.sp4-spec b { font-size: 23px; font-weight: 600; line-height: 1; color: var(--ink); }
.sp4-spec span { font-size: 12px; color: var(--ink-faint); }
@container (max-width: 620px) {
  .sp4-specs { grid-template-columns: repeat(2,1fr); }
  .sp4-spec:nth-child(3) { border-left: 0; }
  .sp4-spec:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
}
.sp4-sunrow {
  display: flex; align-items: center; justify-content: space-between; gap: var(--s3);
  padding: var(--s3); border-top: 1px solid var(--line);
}
.sp4-sun-dir { display: block; font-size: 17px; font-weight: 500; color: var(--forest); line-height: 1.2; }
.sp4-sun-note { display: block; margin-top: 3px; font-size: 12px; color: var(--ink-faint); }
.sp4-dial { width: 76px; height: 76px; flex: 0 0 auto; }
.sp4-dial .ring { stroke: rgba(201,154,78,.3); }
.sp4-dial .tick { stroke: rgba(201,154,78,.45); }
.sp4-dial .arc  { stroke: rgba(201,154,78,.34); stroke-dasharray: 2 4; }
.sp4-dial .house { fill: rgba(11,61,27,.10); }
.sp4-dial .needle { fill: var(--forest); transform-origin: 50% 50%; transition: transform .76s cubic-bezier(.22,1,.36,1); }
.sp4-dial .sun-orbit { transform-origin: 50% 50%; animation: sp4sun 11s linear infinite; }
.sp4-dial .sun { fill: var(--forest); }
.sp4-dial .sun-glow { fill: var(--forest); opacity: .28; }
@keyframes sp4sun {
  0% { transform: rotate(78deg); opacity: 0; } 6% { opacity: 1; }
  94% { opacity: 1; } 100% { transform: rotate(282deg); opacity: 0; }
}

.sp4-block { margin: var(--s5) 0 0; }
.sp4-block > h2 {
  margin: 0 0 var(--s3); padding-bottom: 10px; border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px;
  font-size: 22px; font-weight: 500; color: var(--forest);
}
.sp4-block > h2::before { content: ""; width: 20px; height: 2px; flex: 0 0 auto; background: var(--forest); border-radius: 2px; }
@container (max-width: 700px) { .sp4-block > h2 { font-size: 19px; } }

.sp4-hl { display: grid; gap: 14px; max-width: 62ch; }
.sp4-hl p { margin: 0; color: var(--ink-soft); white-space: pre-line; }
.sp4-hl-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
.sp4-hl-list li { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; color: var(--ink-soft); }
.sp4-hl-list li::before { content: "•"; color: var(--forest); font-size: 17px; line-height: 1.55; }

.sp4-tags { display: flex; flex-wrap: wrap; gap: var(--s1); }
.sp4-tags span {
  font-size: 13px; color: var(--ink-soft); border-radius: var(--r4);
  border: 1px solid var(--line-green); padding: 7px 16px; transition: background .24s, color .24s;
}
.sp4-tags span:hover { border-color: rgba(11,61,27,.3); color: var(--forest); }

.sp4-video, .sp4-map {
  border: 1px solid var(--line); border-radius: var(--r2); overflow: hidden; background: var(--paper-soft);
}
.sp4-video { aspect-ratio: 16/9; position: relative; }
.sp4-map { aspect-ratio: 21/9; }
@container (max-width: 700px) { .sp4-map { aspect-ratio: 4/3; } }
.sp4-video-cover { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: pointer; position: relative; }
.sp4-video-cover img { width: 100%; height: 100%; object-fit: cover; opacity: .85; transition: opacity .3s; }
.sp4-video-cover:hover img { opacity: 1; }
.sp4-play {
  position: absolute; inset: 0; margin: auto; width: 62px; height: 44px;
  display: flex; align-items: center; justify-content: center; border-radius: 14px;
  background: #d81f26; color: #fff; box-shadow: 0 10px 26px rgba(0,0,0,.35); transition: transform .3s;
}
.sp4-video-cover:hover .sp4-play { transform: scale(1.08); }
.sp4-mapbtn {
  margin-top: var(--s2); display: flex; align-items: center; justify-content: center; gap: var(--s1);
  border: 1px solid rgba(11,61,27,.3); border-radius: var(--r4); color: var(--forest);
  padding: 13px var(--s2); font-size: 13px; text-decoration: none; transition: background .24s, transform .24s;
}
.sp4-mapbtn:hover { background: rgba(11,61,27,.07); transform: translateY(-2px); }
.sp4-mapbtn.is-off, .sp4-act.is-off { pointer-events: none; opacity: .5; }

.sp4-rail { position: sticky; top: var(--s3); display: grid; gap: 16px; }
@container (max-width: 960px) { .sp4-rail { position: static; } }
.sp4-card {
  border-radius: var(--r2); padding: var(--s3);
  background: var(--card); border: 1px solid var(--line); box-shadow: var(--shadow);
}
.sp4-card h2 { margin: 0 0 var(--s3); font-size: 20px; font-weight: 500; color: var(--forest); }
.sp4-acts { display: grid; gap: var(--s1); }
.sp4-act {
  display: flex; align-items: center; justify-content: center; gap: var(--s1);
  padding: 14px var(--s2); border: 1px solid var(--forest); border-radius: var(--r4);
  font: inherit; font-size: 14px; cursor: pointer; text-decoration: none;
  background: none; color: var(--forest); transition: background .22s, color .22s, transform .22s;
}
.sp4-act:hover { transform: translateY(-2px); }
.sp4-act.call { background: var(--forest); color: #fff; border-color: var(--forest); }
.sp4-act.call:hover { background: #0e4d23; }
.sp4-act.line { color: var(--forest); border-color: var(--forest); }
.sp4-act.line:hover { background: var(--brand-light); }

.sp4-book { overflow: hidden; max-height: 0; transition: max-height .42s cubic-bezier(.22,1,.36,1); }
.sp4-book.is-open { max-height: 620px; }
.sp4-book-in { padding-top: var(--s2); }
.sp4-book-in h4 { margin: 0 0 9px; font-size: 13px; font-weight: 300; color: var(--ink-faint); }

/* ── ปฏิทินเลือกวัน ── */
.sp4-calhead { display: flex; align-items: center; justify-content: space-between; gap: var(--s1); margin-bottom: 10px; }
.sp4-calhead > button {
  width: 30px; height: 30px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); border-radius: var(--r4); background: none; color: var(--ink-faint);
  cursor: pointer; transition: background .18s, color .18s;
}
.sp4-calhead > button:hover { background: var(--brand-light); color: var(--forest); }
.sp4-calsel { display: flex; gap: 6px; flex: 1 1 auto; justify-content: center; }
.sp4-calsel select, .sp4-time select {
  font: inherit; font-size: 13px; cursor: pointer; padding: 6px 8px;
  border: 1px solid var(--line); border-radius: var(--r1);
  background: #fff; color: var(--ink);
}
.sp4-calsel select:focus, .sp4-time select:focus { outline: none; border-color: var(--forest); }
/* รายการที่กางออกมาเป็นของเบราว์เซอร์ ต้องบังคับสีเองไม่งั้นขาวบนขาว */
.sp4-calsel option, .sp4-time option { background: #fff; color: #1f2937; }

.sp4-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.sp4-dow { text-align: center; font-size: 11px; color: var(--ink-faint); padding: 4px 0; }
.sp4-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  font: inherit; font-size: 13px; cursor: pointer; border-radius: var(--r1);
  border: 1px solid transparent; background: var(--paper); color: var(--ink-soft);
  transition: background .16s, color .16s, border-color .16s;
}
.sp4-day:hover:not(:disabled) { border-color: var(--forest); color: var(--forest); background: var(--brand-light); }
.sp4-day:disabled { opacity: .28; cursor: not-allowed; background: none; }
.sp4-day[aria-pressed="true"] { background: var(--forest); border-color: var(--forest); color: #fff; font-weight: 600; }

/* ── เลือกเวลาแบบ 24 ชั่วโมง ── */
.sp4-time { display: flex; align-items: center; gap: 8px; }
.sp4-time b { color: var(--ink-faint); }
.sp4-time-unit { font-size: 13px; color: var(--ink-faint); }
.sp4-book-sum {
  margin: var(--s2) 0 0; padding: 10px 13px; border-radius: var(--r1);
  background: var(--brand-light); border: 1px solid var(--line);
  font-size: 13px; color: var(--forest);
}
.sp4-lineico { display: inline-block; flex: 0 0 auto; }
.sp4-book-send {
  width: 100%; margin-top: var(--s2); padding: 13px; cursor: pointer; border: 0;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: var(--r4); background: #06C755; color: #06301a; font: inherit; font-size: 14px; font-weight: 500;
  transition: filter .2s, transform .2s;
}
.sp4-book-send:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-2px); }
.sp4-book-send:disabled { opacity: .4; cursor: not-allowed; }

.sp4-calc { margin-top: var(--s3); padding-top: var(--s3); border-top: 1px solid var(--line); }
.sp4-calculator-card .sp4-calc { margin: 0; padding: 0; border: 0; }
.sp4-promotion-link { display: inline-flex; align-items: center; gap: 8px; text-align: left; margin-top: 14px; padding: 8px 0; min-height: 44px; color: var(--forest); background: none; border: 0; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; font: inherit; font-size: 15px; }
.sp4-promotion { background: var(--card); padding: 20px; border: 1px solid var(--line); border-radius: var(--r2); box-shadow: var(--shadow); scroll-margin-top: 100px; }
.sp4-promotion h2 { margin: 0 0 16px; display: flex; align-items: center; gap: 8px; color: var(--forest); font-size: 18px; font-weight: 500; }
.sp4-promotion-image { display: block; border: 0; border-radius: 10px; background: #f8faf8; padding: 0; width: 100%; aspect-ratio: 1; cursor: zoom-in; color: var(--forest); }
.sp4-promotion-image > img { display: block; width: 100%; height: 100%; object-fit: contain; border-radius: 10px; }
.sp4-promotion-navigation { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 12px; }
.sp4-promotion-count { min-width: 48px; text-align: center; color: var(--forest); font-size: 14px; font-variant-numeric: tabular-nums; }
.sp4-promotion-control { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; padding: 0; background: transparent; color: var(--forest); cursor: pointer; }
.sp4-promotion-control:hover { background: rgba(11,61,27,.07); }
.sp4-promotion-until { margin: 10px 0 0; color: var(--ink-soft); font-size: 14px; }
.sp4-promotion :focus-visible, .sp4-promotion-link:focus-visible { outline: 3px solid var(--forest); outline-offset: 4px; }
.sp4-promotion-mobile { display: none; }
@container (max-width: 960px) {
  .sp4-promotion-mobile { display: block; margin-top: 28px; }
  .sp4-promotion-desktop { display: none; }
}
.sp4-calc > h3 { margin: 0 0 var(--s2); font-size: 16px; font-weight: 500; color: var(--ink-faint); }
/* CalculatorSection ออกแบบมาสำหรับพื้นขาวอยู่แล้ว แทบไม่ต้อง override
   ยกเว้นช่อง "ระยะเวลา (ปี)" ที่เป็น bg-gray-50 แล้วออกมาขุ่นบนการ์ดขาว */
.sp4-calc .input-modern.bg-gray-50,
.sp4-calc .bg-gray-50 { background-color: #fff !important; border: 1px solid var(--line-firm) !important; }

.sp4-related { max-width: var(--shell); margin: 0 auto; padding: var(--s6) var(--gutter); }
.sp4-related-head {
  display: flex; align-items: center; justify-content: space-between; gap: var(--s3);
  margin: 0 0 var(--s3); padding-bottom: var(--s1); border-bottom: 1px solid var(--line);
}
.sp4-related-head h2 { margin: 0; display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 500; color: var(--forest); }
.sp4-related-head h2::before { content: ""; width: 20px; height: 2px; background: var(--forest); border-radius: 2px; }
.sp4-railnav { display: flex; gap: var(--s1); }
.sp4-railnav button {
  width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); border-radius: var(--r4); background: none; color: var(--forest);
  cursor: pointer; transition: background .2s, border-color .2s, transform .2s;
}
.sp4-railnav button:hover { background: rgba(11,61,27,.07); border-color: rgba(11,61,27,.28); transform: translateY(-1px); }
@container (max-width: 700px) { .sp4-railnav { display: none; } }
.sp4-railx {
  display: grid; grid-auto-flow: column; grid-auto-columns: 232px; gap: var(--s3);
  overflow-x: auto; padding-bottom: var(--s1); scroll-snap-type: x mandatory;
  scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth;
}
.sp4-railx::-webkit-scrollbar { width: 0; height: 0; display: none; }
.sp4-cardwrap { position: relative; scroll-snap-align: start; }
.sp4-pcard { display: block; text-decoration: none; color: inherit; }
.sp4-pcard-img {
  position: relative; aspect-ratio: 4/3; overflow: hidden; border-radius: var(--r2);
  background: var(--paper-soft); border: 1px solid var(--line);
}
.sp4-pcard-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.22,1,.36,1); }
.sp4-pcard:hover .sp4-pcard-img img { transform: scale(1.05); }
.sp4-pcard h3 { margin: var(--s2) 0 4px; font-size: 15px; font-weight: 500; color: var(--ink); }
.sp4-pcard-loc { font-size: 12px; color: var(--ink-faint); }
.sp4-pcard-amt { margin-top: var(--s1); font-size: 15px; font-weight: 600; color: var(--forest); }
.sp4-cardfav {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  border: 0; border-radius: var(--r4); cursor: pointer;
  background: rgba(255,255,255,.92); color: var(--ink-faint);
  backdrop-filter: blur(6px); transition: color .2s, transform .2s;
}
.sp4-cardfav svg { fill: none; stroke: currentColor; stroke-width: 1.9; transition: fill .24s; }
.sp4-cardfav:hover { color: #b8384a; transform: scale(1.08); }
.sp4-cardfav.is-on { color: #b8384a; }
.sp4-cardfav.is-on svg { fill: #b8384a; }


.sp4-toast {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 500;
  padding: 11px 22px; border-radius: var(--r4); background: var(--forest); color: var(--paper);
  font-size: 14px; box-shadow: 0 12px 34px rgba(11,31,18,.3);
}

@media (prefers-reduced-motion: reduce) {
  .sp4-skel { animation: none; }
  .sp4-layer img, .sp4-dial .sun-orbit, .sp4-dial .needle,
  .sp4-pcard-img img,   .sp4-nav:hover { transform: translateY(-50%); }
  .sp4-back:hover, .sp4-act:hover, .sp4-mapbtn:hover, .sp4-strip button:hover,
  .sp4-pcard:hover .sp4-pcard-img img { transform: none; }
}
`;
