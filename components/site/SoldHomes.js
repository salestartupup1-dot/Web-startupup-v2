/* eslint-disable @next/next/no-html-link-for-pages -- Native links refresh SSR and avoid prefetching stock reads. */
import { getPropertyHeading, getPropertyPath, safeJsonLd, toAbsoluteUrl } from '../../lib/seo';
import { selectListingProperties, listingPage, listingHref, LISTING_PAGE_SIZE } from '../../lib/listingPagination';
import { PORTFOLIO_PATH } from '../../lib/soldHomes';
import { SmartImage, getOptimizedImg } from './SiteApp';
import ListingPagination from './ListingPagination';
import styles from './SoldHomes.module.css';

export default function SoldHomes({ properties = [], listing }) {
  const sold = selectListingProperties(properties, { type: 'sold' }, listing);
  const page = listing?.page || 1;
  const shown = listingPage(sold, page);
  const hrefForPage = nextPage => listingHref({ activeTab: 'portfolio', listing, page: nextPage });
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    url: toAbsoluteUrl(hrefForPage(page)), name: 'ผลงานและบ้านที่ขายแล้ว',
    description: 'รูปบ้านที่ขายแล้วจากรายการบนเว็บไซต์ STARTUP UP',
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าหลัก', item: toAbsoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'ผลงาน', item: toAbsoluteUrl(PORTFOLIO_PATH) },
    ] },
    mainEntity: { '@type': 'ItemList', numberOfItems: sold.length, itemListElement: shown.map((property, index) => ({
      '@type': 'ListItem', position: (page - 1) * LISTING_PAGE_SIZE + index + 1,
      name: getPropertyHeading(property), url: toAbsoluteUrl(getPropertyPath(property)),
    })) },
  };
  return <section id="sold-homes" className={styles.page} aria-labelledby="sold-homes-title">
    <header className={styles.heading}>
      <h2 id="sold-homes-title">บ้านที่ขายแล้ว <span>({sold.length} หลัง)</span></h2>
      <p>ชมรูปและรายละเอียดของบ้านที่ขายแล้วจากรายการบนเว็บไซต์ เพื่อใช้เป็นตัวอย่างในการเลือกบ้านของคุณ</p>
      <p className={styles.note}>รายการเหล่านี้ขายแล้ว หากต้องการนัดชมบ้าน เลือกดูบ้านที่ยังพร้อมขายและยืนยันสถานะกับทีมงานก่อนเดินทาง</p>
      <a className={styles.browse} href="/?tab=all">ดูรายการบ้านปัจจุบัน</a>
    </header>
    {shown.length ? <div className={styles.grid}>
      {shown.map((property, index) => {
        const picture = property.images?.[0] || property.imageUrl;
        const heading = getPropertyHeading(property);
        return <article className={styles.card} key={property.id}>
          <a href={getPropertyPath(property)} className={styles.cardLink}>
            <figure>
              {picture ? <SmartImage src={getOptimizedImg(picture, 720)}
                alt={`ภาพบ้านที่ขายแล้ว ${heading}${property.house_number ? ` บ้านเลขที่ ${property.house_number}` : ''}`}
                width={720} height={540} sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
                loading={index < 3 ? 'eager' : 'lazy'} decoding="async" />
                : <div className={styles.noImage}>ยังไม่มีรูปบ้านในรายการนี้</div>}
              <figcaption>ภาพบ้านที่ขายแล้ว</figcaption>
            </figure>
            <div className={styles.cardBody}>
              <span className={styles.soldLabel}>ขายแล้ว</span>
              <h3>{heading}</h3>
              {property.house_number && <p>บ้านเลขที่ {property.house_number}</p>}
              <span className={styles.detail}>ดูรูปและรายละเอียดบ้าน</span>
            </div>
          </a>
        </article>;
      })}
    </div> : <p className={styles.empty}>ยังไม่มีรายการบ้านที่ยืนยันสถานะขายแล้วในขณะนี้</p>}
    <ListingPagination page={page} totalPages={Math.ceil(sold.length / LISTING_PAGE_SIZE)} hrefForPage={hrefForPage} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  </section>;
}
