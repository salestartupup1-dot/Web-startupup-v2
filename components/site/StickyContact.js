import { Phone } from 'lucide-react';
import { lineContactHref } from '../../lib/lineAttribution';

/**
 * แถบโทร + LINE ติดล่างจอมือถือในหน้ารายการบ้าน
 * ต้องเป็นลิงก์ tel: และ /line/go ธรรมดา เพราะ trigger ใน GTM (URL มี "tel" / "lin"),
 * trackContactClick (ads_conversion___1) และตัวบันทึกการโทรเข้า Lead Source จับจาก href ทั้งหมด
 */
export default function StickyContact({ phone, isEditMode = false }) {
  if (!phone) return null;
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.25)]">
      <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
        <a href={isEditMode ? '#' : `tel:${phone}`} className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-brand-green text-white font-medium text-[16px]">
          <Phone size={18} aria-hidden="true" /> โทรเลย
        </a>
        <a href={isEditMode ? '#' : lineContactHref()} data-contact-placement="sticky_bar" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#06c755] text-white font-medium text-[16px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/line.png" alt="" width="20" height="20" /> ทัก LINE
        </a>
      </div>
    </div>
  );
}
