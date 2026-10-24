/* eslint-disable @next/next/no-img-element -- Cloudinary applies responsive card resizing without an additional image proxy. */
/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation refreshes SSR prices; prefetching house pages would consume database reads. */
import { SEO_LOCATIONS, locationPath } from '../../lib/seoLocations';
import { SEO_LANDINGS } from '../../lib/seoLandings';
import { formatPrice, getPropertyPath } from '../../lib/seo';
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

export function LandingLinks({ footer = false }) {
  return <nav className={`${styles.landingLinks}${footer ? ` ${styles.footerLinks}` : ''}`} aria-label={footer ? 'ค้นหาบ้านตามประเภทและงบประมาณท้ายเว็บ' : 'ค้นหาบ้านตามประเภทและงบประมาณ'}>
    <ul>{SEO_LANDINGS.map(landing => <li key={landing.slug}>
      <a href={locationPath(landing)}>{landing.name}</a>
    </li>)}</ul>
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

export default function SeoBrowse() {
  return <section className={`${styles.section} ${styles.guide}`} aria-labelledby="home-guide-title">
    <article>
      <h2 id="home-guide-title">เรื่องน่ารู้ก่อนเลือกซื้อบ้าน</h2>
      <p>การเลือกบ้านมือสองเริ่มได้จากการมองชีวิตประจำวันของเรา ทั้งเส้นทางไปทำงาน การรับส่งคนในครอบครัว และพื้นที่ที่ต้องใช้จริง แล้วค่อยเปรียบเทียบรายละเอียดของบ้านแต่ละหลัง</p>
      <h3>เริ่มจากการเดินทางที่ใช้เป็นประจำ</h3>
      <p>บ้านในย่านรังสิตและปทุมธานีมีทางเข้าออกและตำแหน่งโครงการแตกต่างกัน ควรดูทั้งอำเภอ คลอง และซอย ไม่ใช่ดูเพียงชื่อทำเล ลองตรวจเส้นทางจากบ้านไปจุดหมายที่ใช้บ่อย และหาโอกาสเดินทางในช่วงเวลาที่ใช้งานจริงก่อนตัดสินใจ</p>
      <h3>เลือกพื้นที่ให้เหมาะกับคนในบ้าน</h3>
      <p>จดจำนวนห้องนอน ห้องน้ำ และที่จอดรถที่ต้องการ รวมถึงมุมทำงาน พื้นที่เก็บของ และพื้นที่ชั้นล่างสำหรับสมาชิกในครอบครัว จากนั้นใช้ข้อมูลขนาดที่ดินและภาพในประกาศช่วยคัดตัวเลือก ก่อนนัดชมการจัดพื้นที่จริง</p>
      <h3>ดูรายละเอียดงานปรับปรุงของแต่ละหลัง</h3>
      <p>บ้านรีโนเวทแต่ละหลังอาจมีขอบเขตงานต่างกัน ควรสอบถามว่าส่วนใดปรับปรุงแล้ว ส่วนใดยังอยู่ระหว่างดำเนินการ และมีอะไรให้พร้อมบ้านบ้าง เมื่อนัดชม ให้เตรียมคำถามจากภาพและรายละเอียดที่อ่านไว้ เพื่อให้ได้ข้อมูลครบก่อนตัดสินใจ</p>
    </article>
    <section className={styles.guideQuestions} aria-labelledby="home-faq-title">
      <h2 id="home-faq-title">คำถามที่พบบ่อย</h2>
      <details className={styles.faq} open>
        <summary>เลือกบ้านตามประเภท โครงการ หรืองบประมาณได้ที่ไหน?</summary>
        <p>เลือกหัวข้อที่ตรงความต้องการ เพื่อดูบ้านพร้อมขายพร้อมข้อมูลประกอบการตัดสินใจ</p>
        <LandingLinks />
      </details>
      <details className={styles.faq}>
        <summary>เลือกอ่านข้อมูลแต่ละทำเลได้ที่ไหน?</summary>
        <p>อ่านข้อมูลและดูรายการในทำเลที่สนใจได้ที่ {SEO_LOCATIONS.map((location, index) => <span key={location.slug}>
          {index > 0 && (index === SEO_LOCATIONS.length - 1 ? ' และ ' : ' / ')}
          <a href={locationPath(location)}>{location.name}</a>
        </span>)} เพื่อเปรียบเทียบตัวเลือกให้ตรงกับเส้นทางและการใช้ชีวิตของคุณ</p>
      </details>
      <details className={styles.faq}>
        <summary>ดูรูปและรายละเอียดบ้านแต่ละหลังอย่างไร?</summary>
        <p>ไปที่ <a href="/?tab=all">บ้านทั้งหมด</a> แล้วเลือกหลังที่สนใจ ในหน้ารายละเอียดจะมีรูป ราคา ขนาดที่ดิน จำนวนห้อง และข้อมูลทำเลของหลังนั้น</p>
      </details>
      <details className={styles.faq}>
        <summary>บ้านรีโนเวททุกหลังพร้อมเข้าอยู่เหมือนกันไหม?</summary>
        <p>สถานะและรายการปรับปรุงของแต่ละหลังแตกต่างกัน ควรสอบถามทีมงานถึงงานที่เสร็จแล้ว งานที่ยังเหลือ และช่วงเวลาที่พร้อมส่งมอบของหลังที่สนใจ เพื่อวางแผนการย้ายเข้าให้ตรงกัน</p>
      </details>
      <details className={styles.faq}>
        <summary>อยากนัดชมบ้าน ต้องแจ้งข้อมูลอะไรบ้าง?</summary>
        <p>เปิดหน้าบ้านที่สนใจแล้วกดปุ่มโทรหรือ LINE แจ้งชื่อโครงการ เลขที่บ้าน และวันเวลาที่สะดวก ทีมงานจะตรวจสอบสถานะบ้านและยืนยันเวลานัดให้ก่อนเดินทาง</p>
      </details>
    </section>
  </section>;
}
