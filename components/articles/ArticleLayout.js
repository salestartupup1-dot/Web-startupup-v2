/* eslint-disable @next/next/no-html-link-for-pages -- Native links also work without JavaScript and avoid stock prefetches. */
import { ARTICLES_PATH } from '../../lib/articleCatalogue';
import styles from './Articles.module.css';

export default function ArticleLayout({ children }) {
  return <div className={styles.site}>
    <a className={styles.skip} href="#article-main">ข้ามไปเนื้อหา</a>
    <header className={styles.siteHeader}>
      <a href="/" className={styles.brand} aria-label="Startup Up กลับหน้าหลัก">STARTUP UP<span>REAL ESTATE</span></a>
      <nav aria-label="เมนูเว็บไซต์"><a href="/">หน้าหลัก</a><a href="/?tab=location">ทำเล</a><a href="/?tab=all">บ้านทั้งหมด</a><a href="/?tab=promo">บ้านโปรโมชั่น</a><a href="/?tab=calculator">คำนวณสินเชื่อ</a><a href="/?tab=portfolio">ผลงาน</a><a href={ARTICLES_PATH} className={styles.currentNav}>บทความ</a></nav>
    </header>
    <main id="article-main" tabIndex={-1} className={styles.main}>{children}</main>
    <footer className={styles.footer}>
      <div><strong>STARTUP UP</strong><p>จุดเริ่มต้นของคนอยากมีบ้าน</p><p>ต.คลองสาม อ.คลองหลวง จ.ปทุมธานี</p></div>
      <nav aria-label="ติดต่อ Startup Up"><a href="/line/go?via=website">ทัก LINE</a><a href="tel:0624782426">โทร 062-478-2426</a><a href={ARTICLES_PATH}>บทความทั้งหมด</a></nav>
    </footer>
  </div>;
}
