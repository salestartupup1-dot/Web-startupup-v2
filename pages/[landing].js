/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation refreshes SSR prices; prefetching house pages would consume database reads. */
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { findSeoLocation, matchesSeoLocation, locationPath } from '../lib/seoLocations';
import { getPublicData } from '../lib/publicDataCache';
import { seoCatalogue } from '../lib/seoCatalogue';
import { privateResponse, unavailablePage } from '../lib/serverPageData';
import { isIndexableProperty, toAbsoluteUrl, getPropertyUrl, safeJsonLd, buildStructuredData, DEFAULT_OG_IMAGE } from '../lib/seo';
import { HouseCards, LocationLinks } from '../components/site/SeoBrowse';
import UnavailablePage from '../components/site/UnavailablePage';
import { subscribePublicData } from '../lib/publicDataSubscription';
import { loadPublicCatalogue } from '../lib/publicCatalogueClient';
import styles from '../components/site/SeoBrowse.module.css';

export async function getServerSideProps({ params, res }) {
  const location = findSeoLocation(params.landing);
  if (!location) return { notFound: true };
  privateResponse(res);
  try {
    const data = await getPublicData();
    return { props: { location, initialData: JSON.parse(JSON.stringify({ properties: seoCatalogue(data.properties).filter(p => isIndexableProperty(p) && matchesSeoLocation(p, location)), company: data.company, version: data.version })) } };
  } catch (error) { return unavailablePage(res, error); }
}

export default function LocationLanding({ location, initialData, unavailable }) {
  const [data, setData] = useState(initialData);
  const [failed, setFailed] = useState(false);
  // Keep prices current in an already-open landing page, using the same single
  // revision subscription as the main website, never a full client collection scan.
  useEffect(() => {
    if (!initialData) return;
    let disposed = false, stop;
    Promise.all([import('firebase/firestore'), import('../components/site/SiteApp')]).then(([firestore, site]) => {
      if (disposed) return;
      stop = subscribePublicData({ initialVersion: initialData.version,
        observe: (options, next, error) => firestore.onSnapshot(firestore.doc(site.db, 'artifacts', site.appId, 'public', 'data', 'site_settings', 'public_version'), options, next, error),
        load: () => loadPublicCatalogue(),
        onData: next => { setData({ ...next, properties: next.props }); setFailed(false); },
        onError: () => setFailed(true),
      });
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; stop?.(); };
  }, [initialData]);
  if (unavailable) return <UnavailablePage />;
  const homes = failed ? [] : data.properties.filter(p => isIndexableProperty(p) && matchesSeoLocation(p, location));
  const canonical = toAbsoluteUrl(locationPath(location));
  const title = `${location.title} | STARTUP UP`;
  const schema = [...buildStructuredData({ companyInfo: data.company }), {
    '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': canonical,
    name: title, description: location.intro, url: canonical,
    mainEntity: { '@type': 'ItemList', numberOfItems: homes.length, itemListElement: homes.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: getPropertyUrl(p), name: p.project_name })) },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าหลัก', item: toAbsoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: `บ้านมือสอง${location.name}`, item: canonical },
    ] },
  }];
  return <><Head>
    <title>{title}</title><meta name="description" content={location.intro} /><link rel="canonical" href={canonical} />
    <meta name="robots" content="index,follow" /><meta property="og:type" content="website" />
    <meta property="og:title" content={title} /><meta property="og:description" content={location.intro} /><meta property="og:url" content={canonical} /><meta property="og:image" content={DEFAULT_OG_IMAGE} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  </Head>
  <header className={styles.header}><a href="/" aria-label="STARTUP UP หน้าหลัก">STARTUP UP · REAL ESTATE</a><a href="/?tab=all">บ้านทั้งหมด</a></header>
  <main className={styles.section}>
    <nav aria-label="เส้นทางหน้าเว็บ"><a href="/">หน้าหลัก</a> / บ้านมือสอง{location.name}</nav>
    <h1>{location.title}</h1><p className={styles.prose}>{location.intro}</p>
    <LocationLinks />
    <section aria-labelledby="location-homes"><h2 id="location-homes">บ้านในทำเล{location.name}{!failed && ` (${homes.length} หลัง)`}</h2>
      {failed ? <p role="status">ยังตรวจสอบราคาล่าสุดไม่ได้ กรุณาโหลดหน้าใหม่อีกครั้ง</p> : homes.length ? <HouseCards properties={homes} /> : <p>ขณะนี้ยังไม่มีรายการเปิดขายในทำเลนี้ ลองเลือกทำเลใกล้เคียงด้านบน หรือดูบ้านทั้งหมด</p>}
    </section>
    <div className={styles.prose}>{location.sections.map(([heading, content]) => <section key={heading}><h2>{heading}</h2><p>{content}</p></section>)}
    <section><h2>คำถามที่พบบ่อย</h2>
      <details className={styles.faq}><summary>บ้านมือสอง{location.name}ราคาเท่าไร?</summary><p>ดูราคาปัจจุบันได้ที่รายการบ้านด้านบน ราคาขึ้นอยู่กับโครงการ ขนาด และรายละเอียดของแต่ละหลัง เปิดหน้าบ้านเพื่อดูข้อมูลครบถ้วนและสอบถามเงื่อนไขก่อนตัดสินใจ</p></details>
      <details className={styles.faq}><summary>ผ่อนเดือนละเท่าไร และยื่นกู้ยากไหม?</summary><p>ค่างวดขึ้นอยู่กับวงเงิน อัตราดอกเบี้ย และระยะเวลากู้ ทดลองคำนวณเบื้องต้นได้ในหน้าบ้านแต่ละหลัง ผลอนุมัติขึ้นอยู่กับรายได้ ภาระหนี้ และเกณฑ์ของธนาคาร ทีมงานช่วยให้ข้อมูลการเตรียมเอกสารได้</p></details>
      <details className={styles.faq}><summary>นัดชมบ้านได้อย่างไร?</summary><p>เปิดบ้านหลังที่สนใจแล้วกดปุ่มโทรหรือ LINE แจ้งชื่อโครงการ เลขที่บ้าน และวันที่สะดวก ทีมงานจะตรวจสอบสถานะและยืนยันเวลานัดให้</p></details>
    </section></div>
    <a href="/?tab=all" className={styles.button}>ดูบ้านทุกทำเล</a>
  </main>
  <footer className={styles.section}><strong>{data.company?.name || 'STARTUP UP'}</strong><p>{data.company?.address}</p><p>{data.company?.phone}</p></footer>
  </>;
}
