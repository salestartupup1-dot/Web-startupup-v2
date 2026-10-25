/* eslint-disable @next/next/no-html-link-for-pages -- Native links also work without JavaScript and avoid stock prefetches. */
import { ARTICLES_PATH } from '../../lib/articleCatalogue';
import styles from './Articles.module.css';
import ArticleHeader from './ArticleHeader';

export default function ArticleLayout({ children }) {
  return <div className={styles.site}>
    <a className={styles.skip} href="#article-main">ข้ามไปเนื้อหา</a>
    <ArticleHeader />
    <main id="article-main" tabIndex={-1} className={styles.main}>{children}</main>
    <footer className={styles.footer}>
      <div><strong>STARTUP UP</strong><p>จุดเริ่มต้นของคนอยากมีบ้าน</p><p>ต.คลองสาม อ.คลองหลวง จ.ปทุมธานี</p></div>
      <nav aria-label="ติดต่อ Startup Up"><a href="/line/go?via=website">ทัก LINE</a><a href="tel:0624782426">โทร 062-478-2426</a><a href={ARTICLES_PATH}>บทความทั้งหมด</a></nav>
    </footer>
  </div>;
}
