import Head from 'next/head';
import { SEO_LOCATIONS, locationPath } from '../lib/seoLocations';
import styles from '../components/site/SeoBrowse.module.css';
export default function NotFound() {
  return <main className={styles.section}>
    <Head><title>ไม่พบหน้าที่ค้นหา | STARTUP UP</title><meta name="robots" content="noindex,follow" /></Head>
    <h1>ไม่พบหน้าที่ค้นหา</h1><p>ลิงก์อาจไม่ถูกต้อง หรือรายการถูกนำออกแล้ว เลือกดูบ้านในทำเลที่สนใจได้ด้านล่าง</p>
    <nav aria-label="ค้นหาบ้านตามทำเล" className={styles.links}>{SEO_LOCATIONS.map(location => <a key={location.slug} href={locationPath(location)}>{location.name}</a>)}</nav>
    <a className={styles.button} href="/?tab=all">ดูบ้านทั้งหมด</a>
  </main>;
}
