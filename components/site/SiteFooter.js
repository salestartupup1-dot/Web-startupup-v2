import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Video } from 'lucide-react';
import { DEFAULT_COMPANY_INFO } from '../../lib/companyInfo';
import { lineContactHref } from '../../lib/lineAttribution';
import { LandingLinks } from './SeoBrowse';
import styles from './SiteFooter.module.css';

const OFFICE_MAP_URL = 'https://maps.app.goo.gl/e3AGFWQjtbVMiBYS9';

const Facebook = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);
const Instagram = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);
const Youtube = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.54 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.54-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></svg>
);

export default function SiteFooter({ companyInfo = DEFAULT_COMPANY_INFO, selectedProperty, propertySlug, contactTitle = 'ติดต่อเรา', followTitle = 'ติดตามเรา' }) {
  // Load the footer photo only when the footer comes within ~1 screen of the viewport.
  const footerRef = useRef(null);
  const [footerPhoto, setFooterPhoto] = useState(false);
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || footerPhoto) return;
    if (typeof IntersectionObserver !== 'function') { footer.classList.add(styles.hasBg); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setFooterPhoto(true); observer.disconnect(); } }, { rootMargin: '800px 0px' });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [footerPhoto]);

  return (
    <footer className={`${styles.footer}${footerPhoto ? ` ${styles.hasBg}` : ''}`} ref={footerRef}>
      <LandingLinks footer />
      <div className={styles.inner}>
        <div>
          <h3>{companyInfo?.name || 'STARTUP UP'}</h3>
          <p>{companyInfo?.description || 'จุดเริ่มต้นของคนอยากมีบ้าน'}</p>
        </div>
        <div className={styles.contact}>
          <h4>{contactTitle}</h4>
          <a
            href={OFFICE_MAP_URL}
            target="_blank" rel="noopener noreferrer"
          >{companyInfo?.address}</a>
          <a className={styles.phone} href={`tel:${companyInfo?.phone}`} data-phone-property-id={selectedProperty?.id} data-phone-property-name={[selectedProperty?.project_name, selectedProperty?.house_number].filter(Boolean).join(' ')} data-phone-property-slug={selectedProperty ? propertySlug : undefined}>โทร {companyInfo?.phone}</a>
          <span>{companyInfo?.email}</span>
        </div>
        <div>
          <h4>{followTitle}</h4>
          <div className={styles.social}>
            <a href={companyInfo?.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook /></a>
            <a href="https://youtube.com/@startupupofficial" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube /></a>
            <a href={lineContactHref(selectedProperty)} data-contact-property-id={selectedProperty?.id} data-contact-property-name={[selectedProperty?.project_name, selectedProperty?.house_number].filter(Boolean).join(' ')} data-contact-property-slug={selectedProperty ? propertySlug : undefined} target="_blank" rel="noopener noreferrer" aria-label="LINE"><MessageCircle size={26} /></a>
            <a href="https://www.instagram.com/startupuprealestate/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram /></a>
            <a href="https://www.tiktok.com/@startupupofficial" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Video size={26} /></a>
          </div>
        </div>
      </div>
      <div className={styles.base}>
        © {new Date().getFullYear()} {companyInfo?.name || 'Startup Up Real Estate'}. All Rights Reserved.
      </div>
    </footer>
  );
}
