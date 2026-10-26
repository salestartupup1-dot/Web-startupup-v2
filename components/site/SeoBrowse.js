/* eslint-disable @next/next/no-img-element -- Cloudinary applies responsive card resizing without an additional image proxy. */
/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation refreshes SSR prices; prefetching house pages would consume database reads. */
import { SEO_LOCATIONS, locationPath } from '../../lib/seoLocations';
import { SEO_LANDINGS } from '../../lib/seoLandings';
import { PORTFOLIO_PATH } from '../../lib/soldHomes';
import { ARTICLES_PATH, ARTICLE_CATALOGUE, articlePath } from '../../lib/articleCatalogue';
import { formatPrice, getPropertyPath } from '../../lib/seo';
import { ArrowRight, BedDouble, ChevronDown, Hammer, MessageCircle, Route } from 'lucide-react';
import { lineContactHref } from '../../lib/lineAttribution';
import styles from './SeoBrowse.module.css';
const cardImage = property => {
  const url = property.images?.[0] || property.imageUrl;
  return url?.includes('cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_640,h_420,c_fill/') : url;
};

export function LocationLinks() {
  return <nav className={styles.links} aria-label="เลือกบ้านตามทำเล">
    {SEO_LOCATIONS.map(location => <a key={location.slug} href={locationPath(location)}>บ้านมือสอง{location.name}</a>)}
  </nav>;
}

export function LandingLinks({ footer = false, chips = false }) {
  const className = chips ? styles.chipLinks : `${styles.landingLinks}${footer ? ` ${styles.footerLinks}` : ''}`;
  return <nav className={className} aria-label={footer ? 'ค้นหาบ้านตามประเภทและงบประมาณท้ายเว็บ' : 'ค้นหาบ้านตามประเภทและงบประมาณ'}>
    <ul>{SEO_LANDINGS.map(landing => <li key={landing.slug}>
      <a href={locationPath(landing)}>{landing.name}</a>
    </li>)}{footer && <><li><a href={PORTFOLIO_PATH}>บ้านที่ขายแล้ว</a></li><li><a href={ARTICLES_PATH}>บทความ</a></li></>}</ul>
  </nav>;
}

export function HouseCards({ properties }) {
  return <div className={styles.grid}>{properties.map((property, index) => <article key={property.id} className={styles.card}>
    <a href={getPropertyPath(property)}>
      {(property.images?.[0] || property.imageUrl) && <img src={cardImage(property)}
        alt={`${property.category || 'บ้าน'} ${property.project_name} บ้านเลขที่ ${property.house_number || ''}`}
        width="640" height="420" loading={index < 3 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" />}
      <div className={styles.cardBody}><h3>{property.project_name}</h3>
        <p>{property.category} · {property.main_location} {property.sub_location}</p>
        <p>บ้านเลขที่ {property.house_number || 'สอบถามทีมงาน'}</p>
        <p>{[property.area_wah ? `${property.area_wah} ตร.ว.` : '', property.bedrooms ? `${property.bedrooms} ห้องนอน` : '', property.bathrooms ? `${property.bathrooms} ห้องน้ำ` : ''].filter(Boolean).join(' · ')}</p>
        <strong>{property.price ? `${formatPrice(property.price)} บาท` : 'สอบถามราคา'}</strong>
        <span className={styles.detail}>ดูรายละเอียดบ้าน →</span>
      </div>
    </a>
  </article>)}</div>;
}

const GUIDE_TIPS = [
  { icon: Route, title: 'เริ่มจากการเดินทางที่ใช้เป็นประจำ', text: 'บ้านในย่านรังสิตและปทุมธานีมีทางเข้าออกและตำแหน่งโครงการแตกต่างกัน ควรดูทั้งอำเภอ คลอง และซอย ไม่ใช่ดูเพียงชื่อทำเล ลองตรวจเส้นทางจากบ้านไปจุดหมายที่ใช้บ่อย และหาโอกาสเดินทางในช่วงเวลาที่ใช้งานจริงก่อนตัดสินใจ' },
  { icon: BedDouble, title: 'เลือกพื้นที่ให้เหมาะกับคนในบ้าน', text: 'จดจำนวนห้องนอน ห้องน้ำ และที่จอดรถที่ต้องการ รวมถึงมุมทำงาน พื้นที่เก็บของ และพื้นที่ชั้นล่างสำหรับสมาชิกในครอบครัว จากนั้นใช้ข้อมูลขนาดที่ดินและภาพในประกาศช่วยคัดตัวเลือก ก่อนนัดชมการจัดพื้นที่จริง' },
  { icon: Hammer, title: 'ดูรายละเอียดงานปรับปรุงของแต่ละหลัง', text: 'บ้านรีโนเวทแต่ละหลังอาจมีขอบเขตงานต่างกัน ควรสอบถามว่าส่วนใดปรับปรุงแล้ว ส่วนใดยังอยู่ระหว่างดำเนินการ และมีอะไรให้พร้อมบ้านบ้าง เมื่อนัดชม ให้เตรียมคำถามจากภาพและรายละเอียดที่อ่านไว้ เพื่อให้ได้ข้อมูลครบก่อนตัดสินใจ' },
];

function Faq({ question, children }) {
  return <details className={styles.faqItem}>
    <summary>{question}<span className={styles.faqChevron} aria-hidden="true"><ChevronDown size={18} /></span></summary>
    <div className={styles.faqAnswer}>{children}</div>
  </details>;
}

/**
 * ส่วนอ่านประกอบท้ายหน้าแรก: บทความ เคล็ดลับก่อนเลือกบ้าน และคำถามที่พบบ่อย
 * แผงเคล็ดลับใช้พื้นเขียวเข้ม + ไอคอนทอง ภาษาเดียวกับกล่องยอดผ่อนบนการ์ดบ้าน
 * คำถามทุกข้อปิดไว้ก่อน ให้ผู้อ่านเลือกเปิดเอง
 */
export default function SeoBrowse() {
  return <div className={styles.home}>
    <section aria-labelledby="home-articles-title">
      <div className={styles.homeHead}>
        <h2 id="home-articles-title" className={styles.homeTitle}>บทความก่อนซื้อบ้าน</h2>
        <a href={ARTICLES_PATH} className={styles.homeMore}>อ่านบทความทั้งหมด <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
      <div className={styles.articleRail}>
        {ARTICLE_CATALOGUE.slice(0, 3).map(article => <article key={article.slug} className={styles.articleCard}>
          <a href={articlePath(article)}>
            <img src={article.cover} alt={article.coverAlt || ''} width={960} height={640} loading="lazy" decoding="async" className={styles.articleCover} />
            <div className={styles.articleBody}>
              {article.category && <span className={styles.articleCategory}>{article.category}</span>}
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <span className={styles.articleRead}>อ่านต่อ <ArrowRight size={15} aria-hidden="true" /></span>
            </div>
          </a>
        </article>)}
      </div>
    </section>

    <section className={styles.guidePanel} aria-labelledby="home-guide-title">
      <span className={styles.homeEyebrow}>ก่อนนัดชมบ้าน</span>
      <h2 id="home-guide-title" className={styles.homeTitle}>เรื่องน่ารู้ก่อนเลือกซื้อบ้าน</h2>
      <p className={styles.guideIntro}>การเลือกบ้านมือสองเริ่มได้จากการมองชีวิตประจำวันของเรา ทั้งเส้นทางไปทำงาน การรับส่งคนในครอบครัว และพื้นที่ที่ต้องใช้จริง แล้วค่อยเปรียบเทียบรายละเอียดของบ้านแต่ละหลัง</p>
      <div className={styles.tips}>
        {GUIDE_TIPS.map(({ icon: Icon, title, text }) => <article key={title} className={styles.tip}>
          <span className={styles.tipIcon} aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>)}
      </div>
    </section>

    <section className={styles.faqWrap} aria-labelledby="home-faq-title">
      <div className={styles.faqAside}>
        <h2 id="home-faq-title" className={styles.homeTitle}>คำถามที่พบบ่อย</h2>
        <p>ไม่เจอคำตอบที่ต้องการ ส่งคำถามถึงทีมงานได้โดยตรง</p>
        <a href={lineContactHref()} target="_blank" rel="noopener noreferrer" data-contact-placement="home_faq" className={styles.faqLine}><MessageCircle size={18} aria-hidden="true" /> ทักทีมงานทาง LINE</a>
      </div>
      <div className={styles.faqList}>
        <Faq question="ดูตัวอย่างบ้านที่ขายแล้วได้ที่ไหน?">
          <p>ดูรูป ชื่อโครงการ และทำเลได้ที่ <a href={PORTFOLIO_PATH}>บ้านที่ขายแล้ว</a> หากสนใจบ้านลักษณะใกล้เคียงกัน ให้ตรวจรายการปัจจุบันและสอบถามทีมงานก่อนนัดชม</p>
        </Faq>
        <Faq question="เลือกบ้านตามประเภท โครงการ หรืองบประมาณได้ที่ไหน?">
          <p>เลือกหัวข้อที่ตรงความต้องการ เพื่อดูบ้านพร้อมขายพร้อมข้อมูลประกอบการตัดสินใจ</p>
          <LandingLinks chips />
        </Faq>
        <Faq question="เลือกอ่านข้อมูลแต่ละทำเลได้ที่ไหน?">
          <p>อ่านข้อมูลและดูรายการในทำเลที่สนใจได้ที่ {SEO_LOCATIONS.map((location, index) => <span key={location.slug}>
            {index > 0 && (index === SEO_LOCATIONS.length - 1 ? ' และ ' : ' / ')}
            <a href={locationPath(location)}>{location.name}</a>
          </span>)} เพื่อเปรียบเทียบตัวเลือกให้ตรงกับเส้นทางและการใช้ชีวิตของคุณ</p>
        </Faq>
        <Faq question="ดูรูปและรายละเอียดบ้านแต่ละหลังอย่างไร?">
          <p>ไปที่ <a href="/?tab=all">บ้านทั้งหมด</a> แล้วเลือกหลังที่สนใจ ในหน้ารายละเอียดจะมีรูป ราคา ขนาดที่ดิน จำนวนห้อง และข้อมูลทำเลของหลังนั้น</p>
        </Faq>
        <Faq question="บ้านรีโนเวททุกหลังพร้อมเข้าอยู่เหมือนกันไหม?">
          <p>สถานะและรายการปรับปรุงของแต่ละหลังแตกต่างกัน ควรสอบถามทีมงานถึงงานที่เสร็จแล้ว งานที่ยังเหลือ และช่วงเวลาที่พร้อมส่งมอบของหลังที่สนใจ เพื่อวางแผนการย้ายเข้าให้ตรงกัน</p>
        </Faq>
        <Faq question="อยากนัดชมบ้าน ต้องแจ้งข้อมูลอะไรบ้าง?">
          <p>เปิดหน้าบ้านที่สนใจแล้วกดปุ่มโทรหรือ LINE แจ้งชื่อโครงการ เลขที่บ้าน และวันเวลาที่สะดวก ทีมงานจะตรวจสอบสถานะบ้านและยืนยันเวลานัดให้ก่อนเดินทาง</p>
        </Faq>
      </div>
    </section>
  </div>;
}
