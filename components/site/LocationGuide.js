import { SEO_LOCATIONS, locationPath } from '../../lib/seoLocations';
import styles from './SeoBrowse.module.css';

export default function LocationGuide({ location }) {
  const others = SEO_LOCATIONS.filter(item => item.slug !== location.slug);
  return <section className={`${styles.section} ${styles.guide}`} aria-labelledby="location-guide-title">
    <article>
      <h2 id="location-guide-title">เรื่องน่ารู้ก่อนเลือกบ้านใน{location.name}</h2>
      <p>{location.intro}</p>
      {location.sections.map(([heading, content]) => <section key={heading}>
        <h3>{heading}</h3><p>{content}</p>
      </section>)}
    </article>
    <section className={styles.guideQuestions} aria-labelledby="location-faq-title">
      <h2 id="location-faq-title">คำถามที่พบบ่อยเกี่ยวกับบ้านใน{location.name}</h2>
      <details className={styles.faq}>
        <summary>บ้านมือสอง{location.name}ราคาเท่าไร?</summary>
        <p>ดูราคาปัจจุบันได้ที่รายการบ้านด้านบน ราคาขึ้นอยู่กับโครงการ ขนาด และรายละเอียดของแต่ละหลัง ใช้ปุ่มเรียงตามราคาเพื่อเปรียบเทียบ แล้วเปิดหน้าบ้านเพื่อดูข้อมูลครบถ้วนและสอบถามเงื่อนไขก่อนตัดสินใจ</p>
      </details>
      <details className={styles.faq}>
        <summary>เลือกดูเฉพาะทาวน์เฮาส์ บ้านแฝด หรือบ้านเดี่ยวได้ไหม?</summary>
        <p>กดตัวกรองด้านบนรายการบ้าน แล้วเลือกประเภทบ้านที่สนใจ ระบบจะแสดงเฉพาะรายการที่ตรงกับตัวเลือกภายในทำเล{location.name} หากไม่พบรายการ ลองล้างตัวกรองหรือเลือกทำเลใกล้เคียง</p>
      </details>
      <details className={styles.faq}>
        <summary>นัดชมบ้านใน{location.name}ได้อย่างไร?</summary>
        <p>เปิดบ้านหลังที่สนใจแล้วกดปุ่มโทรหรือ LINE แจ้งชื่อโครงการ เลขที่บ้าน และวันที่สะดวก ทีมงานจะตรวจสอบสถานะและยืนยันเวลานัดให้ก่อนเดินทาง</p>
      </details>
    </section>
    <p>ดูบ้านในทำเลอื่น: {others.map((item, index) => <span key={item.slug}>
      {index > 0 && ' / '}<a href={locationPath(item)}>บ้านมือสอง{item.name}</a>
    </span>)}</p>
  </section>;
}
