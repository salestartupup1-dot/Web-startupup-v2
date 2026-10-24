import Link from 'next/link';
import { HOME_H1 } from '../../lib/seo';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Bed, Bath, Home, MapPin, Play, Search } from 'lucide-react';
import {
  SmartImage, PropertyMap, getOptimizedImg, getPropertySharePath,
  matchesMainArea, normalizeLocations, visibleLocations, searchResultHref,
} from './SiteApp';
import styles from '../../styles/mobile-home.module.css';

const LOCATION_IMAGES = {
  'กรุงเทพมหานคร': '/locations/bangkok.jpg',
  'นนทบุรี': '/locations/nonthaburi.jpg',
  'ลำลูกกา': '/locations/lam-luk-ka.jpg',
  'คลองหลวง': '/locations/khlong-luang.jpg',
  'ธัญบุรี': '/locations/thanyaburi.jpg',
  'เมืองปทุมธานี': '/locations/mueang-pathum-thani.jpg',
  'อยุธยา': '/locations/ayutthaya.jpg',
};
const CATEGORIES = ['ทาวน์เฮาส์', 'บ้านแฝด', 'บ้านเดี่ยว'];
const priceText = value => Number(String(value || 0).replace(/,/g, '')).toLocaleString('th-TH');
const ordinaryClick = event => !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0;

export function scrollToHomeLocations() {
  const heading = document.getElementById('home-locations');
  if (!heading) return false;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ behavior: 'instant', block: 'start' });
  return true;
}

export default function MobileHome({
  properties, loading, onSelectProp, onFilter, onSearch, onShowAll, onWatchStory,
  onShowLocations = scrollToHomeLocations,
  visualContent, isEditMode,
}) {
  const [query, setQuery] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const available = useMemo(() => properties.filter(p => p.badge !== 'Sold Out' && p.status !== 'sold'), [properties]);
  const locations = useMemo(() => visibleLocations(normalizeLocations(visualContent?.locations)), [visualContent?.locations]);
  const follow = (event, action) => {
    if (isEditMode) { event.preventDefault(); return; }
    if (ordinaryClick(event)) { event.preventDefault(); action(); }
  };

  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="mobile-home-title">
        <div className={styles.heroPicture}>
          <SmartImage src="/featured/singlehouse.jpg" alt="บ้านสองชั้นพร้อมพื้นที่สวนและที่จอดรถ" width={1141} height={1379} priority sizes="(max-width: 700px) 100vw, 50vw" />
          <span className={styles.pictureCaption}>STARTUP UP · REAL ESTATE</span>
        </div>
        <div className={styles.heroContent}>
          <h1 id="mobile-home-title">{HOME_H1}</h1>
          <p className={styles.lead}>เลือกบ้านและทำเลที่คุณสนใจ<br />ให้เราช่วยดูแลตั้งแต่เริ่มต้น</p>
          <div className={styles.actions}>
            <Link prefetch={false} className={styles.primary} href="/?tab=all" onClick={event => follow(event, onShowAll)}>
              <Home size={22} aria-hidden="true" /><span>ดูบ้านทั้งหมด</span><ArrowRight size={22} aria-hidden="true" />
            </Link>
            <a className={styles.secondary} href="?tab=location" onClick={event => follow(event, onShowLocations)}>
              <MapPin size={22} aria-hidden="true" /><span>เลือกทำเล</span><ArrowDown size={22} aria-hidden="true" />
            </a>
          </div>
          <button type="button" className={styles.storyLink} onClick={onWatchStory} disabled={isEditMode}>
            <Play size={17} aria-hidden="true" /> ชมบรรยากาศบ้าน
          </button>
        </div>
      </section>

      <div className={styles.continueHint}><ArrowDown size={18} aria-hidden="true" /> เลื่อนดูทำเลและบ้านด้านล่าง</div>

      <section className={styles.section} aria-labelledby="home-locations">
        <h2 id="home-locations" tabIndex={-1}>อยากอยู่ทำเลไหน?</h2>
        <p className={styles.description}>แตะทำเลเพื่อดูบ้านที่พร้อมขาย</p>
        <div className={styles.locations}>
          {locations.map(location => {
            const count = available.filter(p => matchesMainArea(p, location.area)).length;
            return (
              <a key={location.area} className={styles.location} href={searchResultHref('main_location', location.area)}
                onClick={event => follow(event, () => onFilter('main_location', location.area))}>
                <SmartImage src={LOCATION_IMAGES[location.area] || location.img} alt={`บรรยากาศทำเล${location.area}`} width={400} height={250} sizes="(max-width: 700px) 50vw, 25vw" loading="lazy" />
                <div><h3>{location.area}</h3><span>{loading ? 'กำลังโหลดบ้าน…' : `${count} หลัง`}</span><ArrowRight size={18} aria-hidden="true" /></div>
              </a>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="home-find-title">
        <h2 id="home-find-title">หาบ้านที่เหมาะกับคุณ</h2>
        <form className={styles.search} role="search" onSubmit={event => {
          event.preventDefault();
          if (query.trim() && !isEditMode) onSearch(query.trim());
        }}>
          <label htmlFor="mobile-home-search">ค้นหาชื่อโครงการ ทำเล หรือเลขบ้าน</label>
          <div><input id="mobile-home-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="เช่น คลองหลวง" disabled={isEditMode} required />
            <button type="submit" disabled={isEditMode}><Search size={20} aria-hidden="true" /><span>ค้นหา</span></button></div>
        </form>
        <div className={styles.categories}>
          {CATEGORIES.map(category => (
            <a key={category} href={searchResultHref('category', category)} onClick={event => follow(event, () => onFilter('category', category))}>
              <Home size={21} aria-hidden="true" /><span>{category}</span><ArrowRight size={21} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="home-houses-title" aria-busy={loading}>
        <div className={styles.sectionHead}><h2 id="home-houses-title">บ้านพร้อมขาย</h2>
          <Link prefetch={false} href="/?tab=all" onClick={event => follow(event, onShowAll)}>ดูทั้งหมด <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        {loading ? <p role="status">กำลังโหลดข้อมูลบ้าน…</p> : available.length === 0 ? <p>ยังไม่มีบ้านพร้อมขายในขณะนี้</p> : (
          <div className={styles.houses}>
            {available.slice(0, 3).map(property => (
              <a key={property.id} className={styles.house} href={getPropertySharePath(property)} onClick={event => follow(event, () => onSelectProp(property))}>
                <SmartImage src={getOptimizedImg(property.images?.[0] || property.imageUrl || '/featured/townhouse.jpg', 650)} alt={[property.category || 'บ้าน', property.project_name, property.district].filter(Boolean).join(' ')} width={650} height={430} sizes="(max-width: 700px) 100vw, 33vw" loading="lazy" />
                <div className={styles.houseInfo}>
                  <p className={styles.area}><MapPin size={16} aria-hidden="true" />{property.main_location || property.district || property.category}</p>
                  <h3>{property.project_name}</h3>
                  {property.house_number && <p className={styles.houseNumber}>บ้านเลขที่ {property.house_number}</p>}
                  <p className={styles.price}>฿ {priceText(property.price)}</p>
                  <div className={styles.specs}>
                    {!!property.bedrooms && <span><Bed size={18} aria-hidden="true" />{property.bedrooms} ห้องนอน</span>}
                    {!!property.bathrooms && <span><Bath size={18} aria-hidden="true" />{property.bathrooms} ห้องน้ำ</span>}
                  </div>
                  <span className={styles.detailLink}>ดูรายละเอียดบ้าน <ArrowRight size={19} aria-hidden="true" /></span>
                </div>
              </a>
            ))}
          </div>
        )}
        <Link prefetch={false} className={styles.primary} href="/?tab=all" onClick={event => follow(event, onShowAll)}><span>ดูบ้านทั้งหมด</span><ArrowRight size={22} aria-hidden="true" /></Link>
      </section>

      <section className={styles.section} aria-labelledby="home-map-title">
        <h2 id="home-map-title">ดูบ้านบนแผนที่</h2>
        <p className={styles.description}>ดูตำแหน่งบ้าน แล้วแตะหมุดที่คุณสนใจ</p>
        <button type="button" className={styles.secondary} aria-expanded={mapOpen} aria-controls="home-map" onClick={() => setMapOpen(value => !value)}>
          <MapPin size={22} aria-hidden="true" /><span>{mapOpen ? 'ปิดแผนที่' : 'เปิดแผนที่บ้าน'}</span>
        </button>
        <div id="home-map">{mapOpen && <div className={styles.map}><PropertyMap properties={available} onSelectProp={onSelectProp} variant="story" /></div>}</div>
      </section>
    </div>
  );
}
