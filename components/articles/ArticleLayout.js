import SiteFooter from '../site/SiteFooter';
import styles from './Articles.module.css';
import ArticleHeader from './ArticleHeader';

export default function ArticleLayout({ children }) {
  return <div className={styles.site}>
    <a className={styles.skip} href="#article-main">ข้ามไปเนื้อหา</a>
    <ArticleHeader />
    <main id="article-main" tabIndex={-1} className={styles.main}>{children}</main>
    <SiteFooter />
  </div>;
}
