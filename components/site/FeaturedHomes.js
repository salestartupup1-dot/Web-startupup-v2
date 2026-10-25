/**
 * FeaturedHomes — การ์ดหีบเพลง (accordion) โชว์บ้าน 3 แบบที่คัดมา
 *
 * แถบเรียงแนวนอน ความกว้างเท่ากันตอนพัก พอชี้เมาส์หรือโฟกัสแถบไหน
 * แถบนั้นจะบานออก ส่วนแถบอื่นหดลง (flex: 1 -> flex: 4)
 *
 * แต่ละแถบผูกกับหมวดบ้านจริงบนเว็บ กดแล้วไปหน้ารายการบ้านหมวดนั้นเลย
 * ชื่อหมวดตรงกับที่ HomeSection ใช้ (ทาวน์เฮาส์ / บ้านแฝด / บ้านเดี่ยว)
 *
 * รูปเก็บที่ public/featured/ — เปลี่ยนรูปได้โดยวางไฟล์ทับชื่อเดิม ไม่ต้องแก้โค้ด
 */

import { useCallback, useState } from 'react';
import { homeImage } from '../../lib/homeImage';

/** ข้อมูลชุดเดียว แก้ที่นี่ที่เดียว */
export const FEATURED_HOMES = [
  {
    key: 'townhouse',
    category: 'ทาวน์เฮาส์',
    img: '/featured/townhouse.jpg',
    alt: 'ทาวน์เฮาส์ 2 ชั้น หลังคาสีส้ม ระเบียงชั้นบนราวสีขาว มีที่จอดรถหน้าบ้านและประตูรั้วสีขาว',
    note: 'พื้นที่ใช้สอยคุ้มค่า เดินทางสะดวก',
  },
  {
    key: 'twinhouse',
    category: 'บ้านแฝด',
    img: '/featured/twinhouse.jpg',
    alt: 'บ้านแฝด 2 ชั้น สีครีม หลังคากระเบื้องสีน้ำตาล มีเสาโรมันหน้าบ้านและรั้วโปร่ง',
    note: 'ได้พื้นที่เหมือนบ้านเดี่ยว ในราคาที่จับต้องได้',
  },
  {
    key: 'singlehouse',
    category: 'บ้านเดี่ยว',
    img: '/featured/singlehouse.jpg',
    alt: 'บ้านเดี่ยว 2 ชั้น สีขาว หลังคากระเบื้องสีส้ม มีระเบียงกระจกและลานจอดรถกว้าง',
    note: 'ที่ดินเป็นสัดส่วน เป็นส่วนตัวเต็มที่',
  },
];

export default function FeaturedHomes({ hrefFor, onSelectCategory, isEditMode = false, directLinks = false }) {
  /* บนจอสัมผัสไม่มี hover — แตะหนึ่งครั้งให้กางก่อน แตะซ้ำถึงจะเข้าหน้าหมวด */
  const [openKey, setOpenKey] = useState(null);

  const handleClick = useCallback((event, item) => {
    if (isEditMode) { event.preventDefault(); return; }
    const coarse = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
    if (coarse && !directLinks && openKey !== item.key) {
      event.preventDefault();
      setOpenKey(item.key);
      return;
    }
    if (onSelectCategory) onSelectCategory(event, item.category);
  }, [isEditMode, onSelectCategory, openKey, directLinks]);

  return (
    <div className="fh-card" role="list">
      <style>{featuredCss}</style>
      {FEATURED_HOMES.map((item) => (
        <a
          key={item.key}
          role="listitem"
          className={`fh-item${openKey === item.key ? ' is-active' : ''}`}
          href={hrefFor ? hrefFor(item.category) : undefined}
          onClick={(e) => handleClick(e, item)}
          onFocus={() => setOpenKey(item.key)}
          onMouseEnter={() => setOpenKey(null)}
          aria-label={`ดูบ้านหมวด${item.category} — ${item.note}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="fh-img" {...homeImage(item.img)} width={900} height={item.key === 'twinhouse' ? 1092 : 1088} sizes="(max-width: 700px) 65vw, 400px" alt={item.alt} loading="lazy" decoding="async" />
          <span className="fh-shade" aria-hidden="true" />
          <span className="fh-label">
            <strong>{item.category}</strong>
            <em>{item.note}</em>
          </span>
        </a>
      ))}
    </div>
  );
}

const featuredCss = `
.fh-card {
  /**
   * รูปต้นฉบับเป็นแนวตั้ง 1141x1379 (อัตราส่วน ~0.83)
   * ความกว้างการ์ดจึงคิดย้อนจากความสูง ไม่ได้ตั้งเป็นตัวเลขตายตัว
   * แถบที่กางได้ flex 3 จาก 5 ส่วน => กว้าง = (W-gap*2) * 3/5
   * ตั้ง W = H*1.378 + gap*2 แล้วแถบที่กางจะได้อัตราส่วน 0.826 เท่ารูปต้นฉบับพอดี
   *
   * ที่ใช้ flex 3 ไม่ใช่ 4 เพราะแถบที่หุบต้องกว้างพอให้ชื่อหมวดวางแนวนอนได้
   * (แนวตั้งอ่านยาก) — flex 3 ทำให้แถบหุบกว้าง ~114px พอดีกับ "ทาวน์เฮาส์" 
   */
  --fh-h: clamp(300px, 46vh, 460px);
  --fh-gap: 8px;
  --fh-dur: 500ms;
  --fh-ease: cubic-bezier(0.22, 1, 0.36, 1);
  display: flex; gap: var(--fh-gap);
  width: min(calc(var(--fh-h) * 1.378 + var(--fh-gap) * 2), calc(100vw - 40px));
  height: var(--fh-h);
  margin: 0 auto; pointer-events: auto;
}
.fh-card .fh-item {
  position: relative; flex: 1; min-width: 0;
  overflow: hidden; border-radius: 14px; cursor: pointer;
  text-decoration: none; color: #fdf1e1;
  border: 1px solid rgba(253,241,225,0.28);
  box-shadow: 0 16px 40px rgba(2, 20, 10, 0.42);
  transition: flex var(--fh-dur) var(--fh-ease), border-color var(--fh-dur) ease;
}
/* แถบที่ถูกเลือกบานออก แถบอื่นหดลงเอง เพราะทุกแถบแบ่งพื้นที่กันด้วย flex */
.fh-card .fh-item:hover,
.fh-card .fh-item:focus-visible,
.fh-card .fh-item.is-active {
  flex: 3; border-color: rgba(253,241,225,0.6);
}
.fh-card .fh-item:focus-visible { outline: 2px solid #fdf1e1; outline-offset: 3px; }

.fh-card .fh-img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center 45%;   /* เผื่อไว้ให้เห็นตัวบ้าน ไม่ตัดหลังคา */
  display: block; -webkit-user-drag: none;
  transition: transform 700ms var(--fh-ease);
}
.fh-card .fh-item:hover .fh-img,
.fh-card .fh-item:focus-visible .fh-img,
.fh-card .fh-item.is-active .fh-img { transform: scale(1.04); }

.fh-card .fh-shade {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to top,
    rgba(6,18,11,0.9) 0%, rgba(6,18,11,0.42) 42%, rgba(6,18,11,0.12) 100%);
}

/* ---------- ชื่อหมวด : แนวนอนตลอด อ่านง่ายทั้งตอนหุบและตอนกาง ---------- */
.fh-card .fh-label {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 14px 10px; pointer-events: none;
}
.fh-card .fh-label strong {
  display: block; font-weight: 400; line-height: 1.25;
  font-size: clamp(0.72rem, 0.95vw, 0.88rem); letter-spacing: 0;
  white-space: nowrap; text-align: center;
  transition: font-size var(--fh-dur) var(--fh-ease);
}
.fh-card .fh-label em {
  display: block; font-style: normal; font-weight: 300;
  font-size: 0.82rem; opacity: 0; max-height: 0; overflow: hidden; text-align: left;
  transition: opacity 260ms ease 160ms, max-height var(--fh-dur) var(--fh-ease);
}
/* ตอนกาง : คืนเป็นแนวนอน แล้วโชว์คำอธิบาย */
.fh-card .fh-item:hover .fh-label strong,
.fh-card .fh-item:focus-visible .fh-label strong,
.fh-card .fh-item.is-active .fh-label strong {
  font-size: clamp(1.1rem, 1.6vw, 1.45rem); margin-bottom: 6px; text-align: left;
}
.fh-card .fh-item:hover .fh-label em,
.fh-card .fh-item:focus-visible .fh-label em,
.fh-card .fh-item.is-active .fh-label em { opacity: 0.86; max-height: 3em; }

/* ---------- มือถือ/แท็บเล็ตเล็ก : หีบเพลงแนวตั้ง ---------- */
@media (max-width: 767px) {
  .fh-card {
    --fh-h: clamp(360px, 58vh, 500px);
    flex-direction: column; width: calc(100vw - 32px);
  }
  .fh-card .fh-item { border-radius: 12px; }
  .fh-card .fh-label { padding: 13px; align-items: flex-start; }
  .fh-card .fh-label strong { font-size: 1rem; text-align: left; }
  .fh-card .fh-item:hover .fh-label strong,
  .fh-card .fh-item:focus-visible .fh-label strong,
  .fh-card .fh-item.is-active .fh-label strong { font-size: 1.12rem; margin-bottom: 4px; }
  .fh-card .fh-label em { font-size: 0.76rem; }
}

@media (prefers-reduced-motion: reduce) {
  .fh-card .fh-item, .fh-card .fh-img, .fh-card .fh-label em { transition: none; }
  .fh-card .fh-item:hover .fh-img,
  .fh-card .fh-item:focus-visible .fh-img,
  .fh-card .fh-item.is-active .fh-img { transform: none; }
}
`;
