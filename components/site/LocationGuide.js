import { locationFaq } from '../../lib/locationFaq';
import { locationMarket } from '../../lib/locationMarket';
import { LOCATION_CONTEXT } from '../../lib/locationContext';
import { safeJsonLd } from '../../lib/seo';
import { lineContactHref } from '../../lib/lineAttribution';
import { SEO_LOCATIONS, locationPath } from '../../lib/seoLocations';
import styles from './SeoBrowse.module.css';

export default function LocationGuide({ location, properties = [], companyInfo }) {
  const questions = locationFaq(location, properties);
  const others = SEO_LOCATIONS.filter(item => item.slug !== location.slug);
  const market = locationMarket(location, properties);
  const context = LOCATION_CONTEXT[location.name];
  return <section className={`${styles.section} ${styles.guide}`} aria-labelledby="location-guide-title">
    <article>
      <h2 id="location-guide-title">{location.kind ? `เรื่องน่ารู้ก่อนเลือก${location.name}` : `เรื่องน่ารู้ก่อนเลือกบ้านใน${location.name}`}</h2>
      <p>{location.intro}</p>
      {market.min !== null && <section>
        <h3>{location.kind ? 'ช่วงราคาของบ้านพร้อมขายในรายการนี้' : `ช่วงราคาบ้านที่เปิดรับจองใน${location.name}`}</h3>
        <p>จากรายการที่ระบุราคา {market.pricedCount} หลัง ราคาประกาศ{market.min === market.max ? ` ${market.min.toLocaleString('th-TH')}` : `ตั้งแต่ ${market.min.toLocaleString('th-TH')} ถึง ${market.max.toLocaleString('th-TH')}`} บาท จากทั้งหมด {market.count} หลังที่ยืนยันสถานะเปิดรับจองในกลุ่มทำเลนี้</p>
        <p>{location.kind ? 'ช่วงราคานี้อ้างอิงเฉพาะบ้านพร้อมขายในรายการนี้ ไม่ใช่ราคากลางของตลาด และไม่รวมบ้านติดจอง ขายแล้ว กำลังรีโนเวท หรือรับจองสำรอง' : 'ช่วงราคานี้อ้างอิงเฉพาะรายการบนเว็บไซต์ ไม่ใช่ราคากลางของทั้งทำเล และรวมบ้านที่กำลังรีโนเวทหรือรับจองสำรองตามสถานะของแต่ละหลัง'} เปิดหน้าบ้านเพื่อตรวจราคา สภาพบ้าน และเงื่อนไขล่าสุดก่อนนัดชม</p>
      </section>}
      {context && <section>
        <h3>{context.heading}</h3>
        {context.paragraphs.map(text => <p key={text}>{text}</p>)}
        <p>ข้อมูลสถานที่จาก: {context.sources.map((source, index) => <span key={source.href}>{index > 0 && ' / '}<a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></span>)}</p>
      </section>}
      {location.kind ? <p>{location.criteria}</p> : <p>{location.name === 'รังสิต' ? 'หน้านี้รวมบ้านที่ระบุอำเภอคลองหลวงหรือธัญบุรีในข้อมูลที่อยู่' : location.name === 'ปทุมธานี' ? 'หน้านี้รวมบ้านที่ระบุอำเภอในจังหวัดปทุมธานีในข้อมูลที่อยู่' : `หน้านี้แสดงบ้านที่ระบุอำเภอ${location.name}ในข้อมูลที่อยู่`} โดยใช้ข้อมูลอำเภอเดียวกันในการแสดงรายการ จำนวนบ้าน และช่วงราคา</p>}
      {location.sections.map(([heading, content]) => <section key={heading}>
        <h3>{heading}</h3><p>{content}</p>
      </section>)}
    </article>
    <section className={styles.guideQuestions} aria-labelledby="location-faq-title">
      <h2 id="location-faq-title">คำถามที่พบบ่อยเกี่ยวกับ{location.kind ? location.name : `บ้านใน${location.name}`}</h2>
      {questions.map(([question, answer]) => <details className={styles.faq} key={question}>
        <summary>{question}</summary><p>{answer}</p>
      </details>)}
      <p><a href="/?tab=calculator">ทดลองคำนวณสินเชื่อบ้าน</a></p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: questions.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
      }) }} />
    </section>
    <div className={styles.links}>
      {companyInfo?.phone && <a href={`tel:${companyInfo.phone}`}>โทรสอบถาม{location.kind ? location.name : `บ้านใน${location.name}`}</a>}
      <a href={lineContactHref()} target="_blank" rel="noopener noreferrer">สอบถามทาง LINE</a>
    </div>
    <p>ดูบ้านในทำเลอื่น: {others.map((item, index) => <span key={item.slug}>
      {index > 0 && ' / '}<a href={locationPath(item)}>บ้านมือสอง{item.name}</a>
    </span>)}</p>
  </section>;
}
