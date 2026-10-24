/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation refreshes SSR prices; prefetching house pages would consume database reads. */
import Head from 'next/head';

export default function UnavailablePage() {
  return <><Head><title>กำลังเชื่อมต่อข้อมูลบ้าน | STARTUP UP</title><meta name="robots" content="noindex,follow" /></Head>
    <main style={{ minHeight: '70vh', display: 'grid', placeContent: 'center', gap: 20, padding: 24, textAlign: 'center', color: '#123b2c' }}>
      <h1>กำลังเชื่อมต่อข้อมูลบ้าน</h1><p>ยังตรวจสอบราคาและข้อมูลล่าสุดไม่ได้ กรุณาลองอีกครั้งในอีกสักครู่</p>
      <button type="button" onClick={() => window.location.reload()} style={{ padding: 16, border: '1px solid', borderRadius: 12 }}>ลองอีกครั้ง</button>
      <a href="/">กลับหน้าหลัก</a>
    </main></>;
}
