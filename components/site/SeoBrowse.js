/* eslint-disable @next/next/no-img-element -- Cloudinary applies responsive card resizing without an additional image proxy. */
/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation refreshes SSR prices; prefetching house pages would consume database reads. */
import { SEO_LOCATIONS, locationPath } from '../../lib/seoLocations';
import { formatPrice, getPropertyPath, isIndexableProperty } from '../../lib/seo';
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

export default function SeoBrowse({ properties, loading }) {
  const homes = properties.filter(isIndexableProperty).slice(0, 6);
  return <section className={styles.section} aria-labelledby="browse-location-title">
    <p className={styles.eyebrow}>STARTUP UP REAL ESTATE</p>
    <h2 id="browse-location-title">บ้านมือสองรังสิตและปทุมธานี เลือกทำเลที่ใช่</h2>
    <p>เปรียบเทียบโครงการ ราคา ขนาดที่ดิน และจำนวนห้อง เลือกดูบ้านในทำเลที่เหมาะกับการเดินทางของคุณ แล้วนัดชมบ้านกับทีมงาน</p>
    <LocationLinks />
    {!loading && homes.length > 0 && <><h2>บ้านที่น่าสนใจ</h2><HouseCards properties={homes} /></>}
    <a className={styles.button} href="/?tab=all">ดูบ้านทั้งหมด</a>
  </section>;
}
