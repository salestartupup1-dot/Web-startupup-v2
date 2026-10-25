/**
 * LocationCarousel — แถบทำเล การ์ดกลางเด่น ทำเลอื่นเรียงลดหลั่นออกไปสองข้างจนครบทุกแห่ง
 *
 * ข้อมูลไม่ถูกเขียนไว้ในนี้เลย รับเข้ามาทาง prop `items` อย่างเดียว
 * (ต้นทางจริงคือ site_settings/visual บน Firestore แก้ได้จากหลังบ้าน)
 *
 * วิธีวาง : ไม่ได้ใช้ flex เรียงต่อกัน แต่วางการ์ดทุกใบทับกันที่กึ่งกลาง
 * แล้วผลักออกไปตาม "ระยะห่างจากใบที่กำลังเลือก" (offset)
 *   offset  0  ใบกลาง ขนาดเต็ม มีชื่อทำเลและจำนวนโครงการ
 *   offset ±1  ถัดออกไปข้างละใบ ย่อลง
 *   offset ±2  ย่อลงอีก จางลง
 *   offset ±3  ริมสุด เล็กและจางที่สุด
 *
 * พอเปลี่ยนทำเล offset ของทุกใบขยับพร้อมกัน CSS transition บน transform
 * จึงเห็นเป็นการ "สไลด์ทั้งแถว" โดยไม่ต้องคำนวณตำแหน่งทีละเฟรม
 * ทุกอย่างวิ่งบน transform/opacity ล้วน จึงลื่นและไม่ทำให้หน้าเว็บ reflow
 *
 * การวนไม่รู้จบ : offset ถูกดึงให้อยู่ในช่วง -n/2 ถึง n/2 เสมอ
 * ใบที่ต้องข้ามจากขอบซ้ายไปโผล่ขอบขวาจะถูกปิด transition ไว้ (data-far)
 * เลยไม่มีใบไหนวิ่งพาดจอ และไม่เห็นรอยต่อของการวนกลับ
 *
 * ไม่ใช้ overflow-x, ไม่ใช้ scroll-snap, ไม่มีแถบเลื่อนแนวนอน
 * ไม่ติดตั้งไลบรารีเพิ่ม — ใช้ CSS transition ล้วน
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const HOLD_MS = 1800;      // ค้างก่อนเลื่อนเอง
const SWIPE_PX = 44;
const VISIBLE = 3;         // เห็นข้างละกี่ใบรอบใบกลาง (7 ทำเล = เห็นครบพร้อมกัน)

/* ขนาดและความจางของแต่ละชั้น : index = ระยะห่างจากใบกลาง */
const SCALE = [1, 0.62, 0.46, 0.36];
const FADE = [1, 0.94, 0.62, 0.34];

const prefersReduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function LocationCarousel({
  items = [],
  hrefFor,
  onSelect,
  imageUrl,
  isEditMode = false,
  label = 'ทำเลที่มีบ้าน',
}) {
  const n = items.length;
  const [active, setActive] = useState(0);

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const holdRef = useRef(null);
  const pausedRef = useRef(false);
  const dragRef = useRef(null);
  const draggedAtRef = useRef(0);

  const clearHold = () => { if (holdRef.current) clearTimeout(holdRef.current); holdRef.current = null; };

  useEffect(() => { setActive(0); }, [n]);

  /* ระยะห่างจากใบกลาง โดยเลือกทางที่สั้นที่สุด ซ้ายหรือขวา */
  const offsetOf = useCallback((i) => {
    let off = i - active;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    return off;
  }, [active, n]);

  const goTo = useCallback((i) => {
    if (n < 2) return;
    setActive(((i % n) + n) % n);
  }, [n]);

  const go = useCallback((dir) => { goTo(active + dir); }, [active, goTo]);
  const goRef = useRef(go);
  useEffect(() => { goRef.current = go; }, [go]);

  /* --- ตัวตั้งเวลาเดียวของทั้งคอมโพเนนต์ --- */
  const schedule = useCallback(() => {
    clearHold();
    if (isEditMode || n < 2 || pausedRef.current || prefersReduce()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    holdRef.current = setTimeout(() => { goRef.current(1); }, HOLD_MS);
  }, [isEditMode, n]);

  useEffect(() => { schedule(); return clearHold; }, [schedule, active]);

  /* แท็บถูกซ่อน = หยุดนับ กลับมาแล้วเริ่มนับใหม่จากใบปัจจุบัน */
  useEffect(() => {
    const onVis = () => { if (document.hidden) clearHold(); else schedule(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [schedule]);

  const pause = useCallback(() => { pausedRef.current = true; clearHold(); }, []);
  const resume = useCallback(() => { pausedRef.current = false; schedule(); }, [schedule]);

  /* --- ลาก / ปัดนิ้ว --- */
  const onPointerDown = useCallback((event) => {
    if (n < 2 || event.button > 0) return;
    pause();
    const start = { x: event.clientX, y: event.clientY, moved: false };
    dragRef.current = start;
    const stage = stageRef.current;

    const onMove = (e) => {
      if (!dragRef.current) return;
      const dx = e.clientX - start.x;
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - start.y)) start.moved = true;
      /* ลากแล้วทั้งแถวขยับตามนิ้วทันที ไม่ต้องรอปล่อย */
      if (stage) {
        stage.dataset.dragging = '1';
        stage.style.setProperty('--lg-drag', (dx * 0.55).toFixed(1) + 'px');
      }
    };
    const onUp = (e) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const dx = e.clientX - start.x;
      dragRef.current = null;
      if (stage) { stage.dataset.dragging = '0'; stage.style.setProperty('--lg-drag', '0px'); }
      if (start.moved) draggedAtRef.current = Date.now();
      if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
      resume();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [go, n, pause, resume]);

  /* กดใบข้าง = เลื่อนมาเป็นใบกลาง / กดใบกลาง = เปิดหน้าทำเล / เพิ่งลากมา = ไม่ทำอะไร */
  const onCardClick = useCallback((event, i) => {
    if (dragRef.current?.moved || Date.now() - draggedAtRef.current < 260) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (i !== active) { event.preventDefault(); goTo(i); return; }
    if (onSelect) onSelect(event, items[i]?.area);
  }, [active, goTo, items, onSelect]);

  const onKeyDown = useCallback((event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
  }, [go]);

  /* โหลดรูปรอบ ๆ ไว้ล่วงหน้า */
  useEffect(() => {
    if (!imageUrl || n === 0) return;
    for (let d = -VISIBLE - 1; d <= VISIBLE + 1; d += 1) {
      const src = imageUrl(items[((active + d) % n + n) % n]);
      if (src) { const img = new Image(); img.src = src; }
    }
  }, [active, imageUrl, items, n]);

  const cards = useMemo(() => items.map((loc, i) => {
    const off = offsetOf(i);
    const far = Math.abs(off) > VISIBLE;
    const depth = Math.min(Math.abs(off), SCALE.length - 1);
    return { loc, i, off, far, scale: SCALE[depth], op: far ? 0 : FADE[depth] };
  }), [items, offsetOf]);

  if (n === 0) return null;

  return (
    <div
      className="lg-root"
      ref={rootRef}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={(e) => { if (!rootRef.current?.contains(e.relatedTarget)) resume(); }}
      onKeyDown={onKeyDown}
    >
      <style>{galleryCss}</style>
      <div className="lg-veil" aria-hidden="true" />

      <div
        className="lg-stage"
        ref={stageRef}
        role="list"
        aria-label={label}
        data-dragging="0"
        onPointerDown={onPointerDown}
        onDragStart={(e) => e.preventDefault()}
      >
        {cards.map(({ loc, i, off, far, scale, op }) => (
          <div
            className="lg-slot"
            key={`${loc.area}-${i}`}
            role="listitem"
            data-active={i === active ? '1' : '0'}
            data-far={far ? '1' : '0'}
            style={{ '--off': off, '--sc': scale, '--op': op, zIndex: 20 - Math.abs(off) }}
          >
            <a
              className="lg-card"
              href={hrefFor ? hrefFor(loc.area) : undefined}
              onClick={(e) => onCardClick(e, i)}
              tabIndex={far ? -1 : 0}
              aria-hidden={far ? 'true' : undefined}
              aria-label={i === active
                ? `ทำเล ${loc.area} กดเพื่อดูบ้านในทำเลนี้`
                : `เลื่อนไปที่ทำเล ${loc.area}`}
            >
              <img
                src={imageUrl ? imageUrl(loc) : undefined}
                alt={`บรรยากาศทำเล${loc.area}`}
                width={768}
                height={1024}
                draggable="false"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <span className="lg-shade" aria-hidden="true" />
              <span className="lg-body">
                <em>{loc.count == null ? 'ดูบ้านในทำเลนี้' : `${loc.count} หลัง`}</em>
                <strong>{loc.area}</strong>
                <i aria-hidden="true" />
              </span>
              <span className="lg-tip" aria-hidden="true">{loc.area}</span>
            </a>
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className="lg-nav">
          <button type="button" className="lg-arrow" aria-label="ดูทำเลก่อนหน้า" onClick={() => { pause(); go(-1); resume(); }}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className="lg-arrow" aria-label="ดูทำเลถัดไป" onClick={() => { pause(); go(1); resume(); }}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </div>
  );
}

const galleryCss = `
.lg-root {
  --lg-h: clamp(260px, 46vh, 460px);
  --lg-w: calc(var(--lg-h) * 0.75);           /* การ์ดแนวตั้ง 3:4 */
  --lg-step: calc(var(--lg-w) * 0.62 + 16px); /* ระยะห่างระหว่างใบ กะให้ 7 ใบพอดีจอ */
  --lg-dur: 700ms;
  --lg-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lg-drag: 0px;
  position: relative; width: 100%; overflow: hidden;
  padding-bottom: 62px;                        /* เว้นที่ให้ปุ่มลูกศรด้านล่าง */
}
/* แถบไล่สีบาง ๆ หลังการ์ด ให้ตัวหนังสือลอยขึ้นมาจากภาพโดยไม่บังภาพ */
.lg-root .lg-veil {
  position: absolute; z-index: 0; left: 0; right: 0; top: -26px; bottom: 30px;
  pointer-events: none;
  background: linear-gradient(180deg,
    rgba(9,26,15,0) 0%, rgba(9,26,15,0.22) 26%, rgba(9,26,15,0.3) 72%, rgba(9,26,15,0) 100%);
}
.lg-root .lg-stage {
  position: relative; z-index: 1;
  height: var(--lg-h); width: 100%;
  touch-action: pan-y;                         /* ปัดแนวนอนเป็นของแถบ ปัดแนวตั้งยังเลื่อนหน้าได้ */
  cursor: grab;
}
.lg-root .lg-stage:active { cursor: grabbing; }

/* ทุกใบทับกันที่กึ่งกลาง แล้วค่อยผลักออกตาม --off */
.lg-root .lg-slot {
  position: absolute; top: 0; left: 50%;
  width: var(--lg-w); height: 100%;
  margin-left: calc(var(--lg-w) / -2);
  opacity: var(--op, 1);
  transform: translate3d(calc(var(--lg-step) * var(--off) + var(--lg-drag)), 0, 0) scale(var(--sc, 1));
  transition: transform var(--lg-dur) var(--lg-ease), opacity var(--lg-dur) var(--lg-ease);
  will-change: transform, opacity;
}
/* ใบที่ต้องข้ามจากขอบหนึ่งไปโผล่อีกขอบ ห้ามให้มันวิ่งพาดจอ */
.lg-root .lg-slot[data-far="1"] { transition: none; pointer-events: none; }
/* ระหว่างลาก ให้ตามนิ้วทันที ไม่หน่วง */
.lg-root .lg-stage[data-dragging="1"] .lg-slot { transition: opacity var(--lg-dur) var(--lg-ease); }

.lg-root .lg-card {
  position: relative; display: block; width: 100%; height: 100%;
  border-radius: 18px; overflow: hidden; text-decoration: none; color: #fdf1e1;
  box-shadow: 0 20px 50px rgba(2, 20, 10, 0.48);
  transition: box-shadow var(--lg-dur) var(--lg-ease);
}
.lg-root .lg-slot[data-active="1"] .lg-card { box-shadow: 0 30px 70px rgba(2, 20, 10, 0.62); }
.lg-root .lg-card:focus-visible { outline: 2px solid #fdf1e1; outline-offset: 4px; }
.lg-root .lg-card img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; display: block;
  -webkit-user-drag: none; user-select: none;
}
.lg-root .lg-shade {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to top,
    rgba(11,31,18,0.92) 0%, rgba(11,31,18,0.3) 46%, rgba(27,94,32,0.06) 100%);
  transition: background var(--lg-dur) var(--lg-ease);
}
/* ใบข้าง ๆ หรี่ลง ให้สายตาไปหยุดที่ใบกลาง */
.lg-root .lg-slot[data-active="0"] .lg-shade { background: rgba(9,26,15,0.44); }
.lg-root .lg-slot[data-active="0"] .lg-card:hover .lg-shade { background: rgba(9,26,15,0.2); }

/* ชื่อทำเลเต็ม ๆ เฉพาะใบกลาง */
.lg-root .lg-body {
  position: absolute; left: 22px; right: 22px; bottom: 22px; max-width: 92%;
  opacity: 0; transform: translateY(10px);
  transition: opacity 300ms ease 260ms, transform 340ms var(--lg-ease) 260ms;
}
.lg-root .lg-slot[data-active="1"] .lg-body { opacity: 1; transform: translateY(0); }
.lg-root .lg-body em {
  display: block; font-style: normal; font-size: 0.7rem; font-weight: 400;
  letter-spacing: 0.18em; opacity: 0.78; margin-bottom: 8px;
}
.lg-root .lg-body strong {
  display: block; font-size: clamp(1.25rem, 1.8vw, 1.8rem); font-weight: 300; line-height: 1.18;
}
.lg-root .lg-body i {
  display: block; margin-top: 12px; width: 46px; height: 1px; background: rgba(253,241,225,0.75);
}
/* ใบข้างมีชื่อย่อ ๆ พอให้รู้ว่าเป็นทำเลอะไร (ขยายกลับเพราะทั้งใบถูกย่อ) */
.lg-root .lg-tip {
  position: absolute; left: 0; right: 0; bottom: 16px; text-align: center;
  font-size: 0.82rem; font-weight: 300; color: #fdf1e1; opacity: 0;
  transform: scale(calc(1 / var(--sc, 1)));
  text-shadow: 0 3px 14px rgba(0,0,0,0.6);
  transition: opacity 260ms ease;
  pointer-events: none; white-space: nowrap;
}
.lg-root .lg-slot[data-active="0"] .lg-tip { opacity: 0.86; }

/* ---------- ปุ่มลูกศร : ใต้แถบ ตรงกลาง ไม่ทับการ์ดและไม่ทับชื่อ ---------- */
.lg-root .lg-nav {
  position: absolute; z-index: 22; left: 50%; bottom: 4px; transform: translateX(-50%);
  display: flex; gap: 12px;
}
.lg-root .lg-arrow {
  display: inline-flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: 999px; font: inherit; font-size: 16px;
  color: #fdf1e1; background: rgba(11,31,18,0.5);
  border: 1px solid rgba(253,241,225,0.36); backdrop-filter: blur(10px);
  cursor: pointer; transition: background 200ms ease, color 200ms ease;
}
.lg-root .lg-arrow:hover { background: rgba(253,241,225,0.92); color: #0b3d1b; }
.lg-root .lg-arrow:focus-visible { outline: 2px solid #fdf1e1; outline-offset: 3px; }

@media (max-width: 1024px) {
  .lg-root { --lg-h: clamp(240px, 38vh, 400px); --lg-step: calc(var(--lg-w) * 0.66 + 12px); }
  .lg-root .lg-body { left: 18px; right: 18px; bottom: 18px; }
}
@media (max-width: 640px) {
  .lg-root { --lg-h: clamp(230px, 36vh, 340px); --lg-step: calc(var(--lg-w) * 0.74 + 10px); padding-bottom: 0; }
  .lg-root .lg-nav { display: none; }          /* มือถือเน้นปัดนิ้ว */
  .lg-root .lg-veil { bottom: 0; }
  .lg-root .lg-body { left: 15px; right: 15px; bottom: 15px; }
  .lg-root .lg-body em { font-size: 0.62rem; margin-bottom: 6px; }
  .lg-root .lg-body i { margin-top: 9px; width: 34px; }
  .lg-root .lg-tip { font-size: 0.72rem; bottom: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .lg-root .lg-slot { transition: opacity 200ms linear; }
  .lg-root .lg-body, .lg-root .lg-tip { transition: none; }
}
`;
