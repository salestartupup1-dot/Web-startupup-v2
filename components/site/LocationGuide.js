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
      <h2 id="location-guide-title">เรื่องน่ารู้ก่อนเลือกบ้านใน{location.name}</h2>
      <p>{location.intro}</p>
      {market.min !== null && <section>
        <h3>ช่วงราคาบ้านที่เปิดรับจองใน{location.name}</h3>
        <p>จากรายการที่ระบุราคา {market.pricedCount} หลัง ราคาประกาศ{market.min === market.max ? ` ${market.min.toLocaleString('th-TH')}` : `ตั้งแต่ ${market.min.toLocaleString('th-TH')} ถึง ${market.max.toLocaleString('th-TH')}`} บาท จากทั้งหมด {market.count} หลังที่ยืนยันสถานะเปิดรับจองในกลุ่มทำเลนี้</p>
        <p>ช่วงราคานี้อ้างอิงเฉพาะรายการบนเว็บไซต์ ไม่ใช่ราคากลางของทั้งทำเล และรวมบ้านที่กำลังรีโนเวทหรือรับจองสำรองตามสถานะของแต่ละหลัง เปิดหน้าบ้านเพื่อตรวจราคา สภาพบ้าน และเงื่อนไขล่าสุดก่อนนัดชม</p>
      </section>}
      {context && <section>
        <h3>{context.heading}</h3>
        {context.paragraphs.map(text => <p key={text}>{text}</p>)}
        <p>ข้อมูลสถานที่จาก: {context.sources.map((source, index) => <span key={source.href}>{index > 0 && ' / '}<a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></span>)}</p>
      </section>}
      {location.name === 'คลองหลวง' && <p>หน้านี้จัดกลุ่มทำเลสำหรับค้นหาบ้านในคลองหลวง คลอง 1–3 และพยอม ส่วนคลองหลวง คลอง 4 ดูได้ในกลุ่มธัญบุรี การจัดกลุ่มนี้เพื่อช่วยค้นหาบ้าน กรุณาตรวจอำเภอและจังหวัดจริงของแต่ละหลังในหน้ารายละเอียด</p>}
      {location.name === 'ธัญบุรี' && <p>หน้านี้รวมทำเลธัญบุรีและรายการที่ระบุคลองหลวง คลอง 4 เพื่อให้เลือกดูตามกลุ่มทำเลของเว็บไซต์ โดยที่อยู่จริงยังอ้างอิงข้อมูลของบ้านแต่ละหลัง</p>}
      {location.name === 'ลำลูกกา' && <p>กลุ่มทำเลนี้รวมบ้านลำลูกกาและสายไหมเพื่อช่วยเปรียบเทียบพื้นที่ใกล้เคียง สายไหมอยู่กรุงเทพมหานคร จึงไม่ได้รวมในหน้าบ้านปทุมธานี</p>}
      {location.name === 'รังสิต' && <p>กลุ่มรังสิตรวมรายการจากกลุ่มคลองหลวงและธัญบุรีของเว็บไซต์ รวมถึงพยอมในกลุ่มคลองหลวง กรุณาดูที่อยู่และตำแหน่งของบ้านแต่ละหลังประกอบก่อนนัดชม</p>}
      {location.sections.map(([heading, content]) => <section key={heading}>
        <h3>{heading}</h3><p>{content}</p>
      </section>)}
    </article>
    <section className={styles.guideQuestions} aria-labelledby="location-faq-title">
      <h2 id="location-faq-title">คำถามที่พบบ่อยเกี่ยวกับบ้านใน{location.name}</h2>
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
      {companyInfo?.phone && <a href={`tel:${companyInfo.phone}`}>โทรสอบถามบ้านใน{location.name}</a>}
      <a href={lineContactHref()} target="_blank" rel="noopener noreferrer">สอบถามทาง LINE</a>
    </div>
    <p>ดูบ้านในทำเลอื่น: {others.map((item, index) => <span key={item.slug}>
      {index > 0 && ' / '}<a href={locationPath(item)}>บ้านมือสอง{item.name}</a>
    </span>)}</p>
  </section>;
}
