import { promotionImage } from '../../lib/promotionImage';
export default function PromotionDocument({ imageUrl }) {
  return <>
    <style>{`
      body:has(.site-promotion[open]) { overflow:hidden !important; }
      .site-promotion { border:0; padding:0; margin:auto; width:min(520px,calc(100vw - 32px)); max-height:calc(100dvh - 32px); overflow:auto; border-radius:22px; background:#fdf1e1; color:#0b3d1b; font-family:Prompt,system-ui,sans-serif; }
      .site-promotion:not([open]) { display:none; }
      .site-promotion[open] { display:flex; flex-direction:column; }
      .site-promotion::backdrop { background:rgba(6,20,10,.72); }
      .site-promotion img { display:block; width:100%; height:auto; max-height:78vh; object-fit:contain; min-height:0; flex-shrink:1; }
      .site-promotion footer { flex-shrink:0; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 18px; font-size:14px; }
      .site-promotion label { display:flex; align-items:center; gap:5px; }
      .site-promotion input { accent-color:#0b3d1b; }
      .site-promotion button { min-height:44px; border:0; border-radius:99px; padding:8px 18px; background:#0b3d1b; color:#fdf1e1; font:inherit; cursor:pointer; white-space:nowrap; }
      .site-promotion :focus-visible { outline:2px solid #0b3d1b; outline-offset:3px; }
      @media(max-width:420px) { .site-promotion footer { padding:12px; gap:8px; font-size:12px; } }
    `}</style>
    <dialog id="site-promotion" data-image-url={imageUrl || ''} className="site-promotion" aria-label="โปรโมชั่น" aria-modal="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...(imageUrl ? promotionImage(imageUrl) : {})} className="v4-popup-img" alt="โปรโมชั่น" fetchPriority="high" />
      <footer><label><input type="checkbox" />ไม่แสดงหน้านี้อีกใน 24 ชม.</label><button type="button" autoFocus>ปิดหน้าต่าง</button></footer>
    </dialog>
  </>;
}
