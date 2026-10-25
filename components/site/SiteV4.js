/**
 * v4 — เว็บ STARTUP UP ดีไซน์ใหม่
 *
 * ใช้ข้อมูลและระบบหลังบ้านชุดเดียวกับหน้าเดิมทั้งหมด (ผ่าน useSiteData + คอมโพเนนต์จาก SiteApp)
 * ต่างกันแค่เปลือกนอก : เปิดด้วยฉากภาพยนตร์เดินเข้าบ้าน แล้วห่อทุกส่วนด้วยชุดสีและฟอนต์ใหม่
 *
 *   ฉากเปิด        CinemaHero (การ์ดสไลด์ = บ้านจริงจาก Firestore)
 *   หน้าหลัก        HomeSection ตัวเดิมจากเว็บหลัก (ช่องค้นหา แถบทำเล แผนที่หมุด
 *                  บ้านแยกหมวด whyUs) — HeroSection ไม่ต้องใช้ ฉากภาพยนตร์แทนแล้ว
 *   แท็บอื่น        PropertiesList / CalculatorSection / PortfolioSection
 *   รายหลัง         SalePageV4 (ดีไซน์ใหม่ ไม่ได้แตะ SalePage เดิมที่หน้า / ใช้อยู่)
 *   หลังบ้าน        AdminPanel + LoginModal + โหมดแก้ไขหน้าเว็บ (ตัวเดิมทั้งหมด)
 */

import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SITE_NAV_TABS as NAV_TABS } from '../../lib/siteNavigation';
import { lineContactHref } from '../../lib/lineAttribution';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Settings, Search, CircleUserRound, Menu, X, Loader, Save, Layout, Type,
  ChevronLeft, ChevronRight, MessageCircle, Video,
} from 'lucide-react';

import useSiteData from './useSiteData';
import PublicDataNotice from './PublicDataNotice';
import PromotionPopup from './PromotionPopup';
import SeoBrowse, { LandingLinks } from './SeoBrowse';
import { seoLocationFromSearch } from '../../lib/seoLocations';
import StickyContact from './StickyContact';
import useRevealOnScroll from './useRevealOnScroll';
import { safeJsonLd } from '../../lib/seo';
import {
  HomeSection, PropertiesList, CalculatorSection, PortfolioSection,
  LoginModal, CustomAlertModal, Lightbox, SmartImage, EditableText,
  getOptimizedImg, DEFAULT_LOCATIONS_DATA, DEFAULT_VISUAL_CONTENT, generatePropSlug,
} from './SiteApp';

// Each view still renders on the server, but the browser only downloads the code of the view
// it shows: an ad visitor on a listing never fetches the cinema scene or the house page.
const CinemaHero = dynamic(() => import('./CinemaHero'));
const MobileHome = dynamic(() => import('./MobileHome'));
const SalePageV4 = dynamic(() => import('./SalePageV4'));
const LocationListing = dynamic(() => import('./LocationListing'));
const LocationGuide = dynamic(() => import('./LocationGuide'));
const SoldHomes = dynamic(() => import('./SoldHomes'));
// The back office is only opened by admins; visitors never download it.
const AdminPanel = dynamic(() => import('./AdminPanel'), { ssr: false });

const Facebook = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);
const Instagram = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);
const Youtube = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.13 1 12 1 12s0 3.87.54 5.58a2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.87 23 12 23 12s0-3.87-.54-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></svg>
);

// Open the cinematic home on every screen; keep the static accessibility fallback.
const SIMPLE_HOME_QUERY = '(prefers-reduced-motion: reduce)';
const subscribeHomeLayout = callback => {
  const query = window.matchMedia(SIMPLE_HOME_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const getHomeLayout = () => window.matchMedia(SIMPLE_HOME_QUERY).matches;
const getServerHomeLayout = () => false;

/**
 * ลิงก์แผนที่ออฟฟิศ — ใช้ลิงก์ที่ปักหมุดไว้แล้ว ไม่ใช่ค้นหาจากข้อความที่อยู่
 * ของเดิมส่งข้อความที่อยู่ไปให้ Google ค้นเอา ซึ่งบางทีได้หมุดผิดตำแหน่ง
 * ถ้าย้ายออฟฟิศ ให้แก้ที่บรรทัดนี้ (ตัวข้อความที่อยู่แก้จากหลังบ้านได้ตามเดิม)
 */
const OFFICE_MAP_URL = 'https://maps.app.goo.gl/e3AGFWQjtbVMiBYS9';

function Waiting() {
  return (
    <div className="v4-loading">
      <Loader className="v4-spin" size={44} />
      <p>กำลังเตรียมข้อมูล...</p>
    </div>
  );
}

export default function SiteV4({ basePath = '/v4', initialData }) {
  const site = useSiteData({ basePath, initialData });
  const {
    db, appId, userRole, userEmail, authReady, properties, publicProperties, companyInfo, authorizedUsers,
    loading, publicDataError, visualContent, popupData,
    activeTab, setActiveTab, isRouteReady, searchParams, selectedProperty, requestedPropSlug, setRequestedPropSlug, setSelectedProperty,
    showLoginModal, setShowLoginModal, showAdminPanel, setShowAdminPanel,
    showPopupModal, isSnoozeChecked, setIsSnoozeChecked, dismissPopup,
    lightbox, openLightbox, closeLightbox, globalAlert,
    isVisualEditMode, updateVisualContent, undoVisual, redoVisual,
    saveVisualEdit, cancelVisualEdit, isSavingVisual, canUndo, canRedo,
    handleLocationImageUpdate, handleRemoveLocationImage, enterVisualEditMode,
    handleLogout, handleGoogleLogin, goTab, handleFilterSelect, handleGlobalSearch, handleSelectProperty,
    seoMeta, structuredData,
    listing, updateListing,
  } = site;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const prefersSimpleHome = useSyncExternalStore(subscribeHomeLayout, getHomeLayout, getServerHomeLayout);
  const [watchStory, setWatchStory] = useState(false);
  const simpleHome = prefersSimpleHome && !watchStory;
  const navigationRequest = useRef(0);
  // The initial route renders the hero; do not paint a light navbar before effects run.
  const [navOverHero, setNavOverHero] = useState(true);

  /**
   * ช่องค้นหาบนแถบเมนู — ปกติเป็นแค่ปุ่มแว่นขยาย กดแล้วช่องพิมพ์คลี่ออกตรงนั้น
   * ตอนหุบช่องกว้าง 0 จึงไม่กินที่ในแถบเมนูเลย
   * ต่อเข้า handleGlobalSearch ตัวเดิมที่ช่องค้นหาหน้าแรกใช้อยู่ ไม่มีตรรกะค้นหาใหม่
   */
  const [isNavSearchOpen, setIsNavSearchOpen] = useState(false);
  const [navSearchText, setNavSearchText] = useState('');
  const navSearchInputRef = useRef(null);

  const closeNavSearch = useCallback(() => {
    setIsNavSearchOpen(false);
    setNavSearchText('');
  }, []);

  const runSearch = useCallback((keyword) => {
    handleGlobalSearch(keyword);
    closeNavSearch();
    setIsMenuOpen(false);
  }, [closeNavSearch, handleGlobalSearch]);

  /* ปุ่มแว่นขยายทำหน้าที่ทั้งเปิดช่องและสั่งค้นหา แล้วแต่ว่าตอนนั้นพิมพ์อะไรไว้หรือยัง */
  const submitNavSearch = useCallback((e) => {
    e.preventDefault();
    const keyword = navSearchText.trim();
    if (keyword) { runSearch(keyword); return; }
    if (!isNavSearchOpen) {
      setIsNavSearchOpen(true);
      /* โฟกัสหลัง React วาดช่องเสร็จ ไม่งั้นจะไปโฟกัสตัวที่ยังกว้าง 0 แล้วหลุด */
      requestAnimationFrame(() => navSearchInputRef.current?.focus());
      return;
    }
    closeNavSearch();
  }, [closeNavSearch, isNavSearchOpen, navSearchText, runSearch]);

  const submitMenuSearch = useCallback((e) => {
    e.preventDefault();
    const keyword = navSearchText.trim();
    if (keyword) runSearch(keyword);
  }, [navSearchText, runSearch]);

  /**
   * ทางเข้าหลังบ้าน — ไม่มีปุ่มให้ลูกค้าเห็นบนหน้าเว็บแล้ว เปิดด้วย ?admin=1 แทน
   * useSiteData จะล้างพารามิเตอร์นี้ออกจากแถบที่อยู่เองในจังหวะถัดไป
   * รอให้โหลดเสร็จก่อนค่อยตัดสินใจ เพราะสิทธิ์ของบัญชีเพิ่งกู้คืนมาจาก Firebase
   */
  // Capture the URL before useSiteData rewrites it, but render the loading UI
  // only after mount so the server and hydration markup remain identical.
  const adminEntryRequested = useRef(typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('admin') === '1');
  const [adminEntryPending, setAdminEntryPending] = useState(false);
  useEffect(() => {
    if (adminEntryRequested.current) setAdminEntryPending(true);
  }, []);
  useEffect(() => {
    if (!adminEntryPending || !authReady) return;
    setAdminEntryPending(false);
    // รอเฉพาะการกู้คืนบัญชีและสิทธิ์ แยกจากการโหลดข้อมูลหน้าเว็บ
    if (userRole) setShowAdminPanel(true); else setShowLoginModal(true);
  }, [adminEntryPending, authReady, userRole, setShowAdminPanel, setShowLoginModal]);

  // ?tab=location is a plain server-rendered list now (ad landing), not a station in the cinema scene.
  const isHomeScene = activeTab === 'home';
  // House pages have their own contact buttons and the cinema home is full-screen, so neither gets the bar.
  const showStickyContact = !isHomeScene && !selectedProperty && !requestedPropSlug && Boolean(companyInfo?.phone);
  const isCinemaView = isHomeScene && !selectedProperty && !requestedPropSlug && !simpleHome;
  const isWaiting = loading || Boolean(requestedPropSlug);
  const locationLanding = activeTab === 'search_result' ? seoLocationFromSearch(searchParams) : undefined;

  /* globals.css ซ่อนทุกส่วนที่ติด .reveal-on-scroll ไว้ที่ opacity 0
     ต้องมีตัวนี้คอยเติม .is-revealed ให้ ไม่งั้นเนื้อหาทั้งหน้าจะไม่โผล่เลย */
  useRevealOnScroll([activeTab, selectedProperty, loading, publicProperties.length, isCinemaView]);

  /* ใช้เฉดมืดตราบใดที่แถบเมนูยังลอยอยู่บนภาพของฉากภาพยนตร์
     (วัดจากขอบล่างของ section จริง ไม่ใช่แค่ scrollY เพราะฉากยาวหลายพันพิกเซล) */
  useEffect(() => {
    const measure = () => {
      const stage = document.querySelector('.cinema-scroll');
      setNavOverHero(Boolean(stage) && stage.getBoundingClientRect().bottom > 90);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [activeTab, selectedProperty, loading, isCinemaView]);

  useEffect(() => { setIsMenuOpen(false); }, [activeTab, selectedProperty]);

  // Load the footer photo only when the footer comes within ~1 screen of the viewport.
  const footerRef = useRef(null);
  const [footerPhoto, setFooterPhoto] = useState(false);
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || footerPhoto) return;
    if (typeof IntersectionObserver !== 'function') { setFooterPhoto(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setFooterPhoto(true); }, { rootMargin: '800px 0px' });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [footerPhoto]);

  // Warm detail code when a listing is actually in use; the cinematic intro
  // should not download an unrelated house page during its first paint.
  useEffect(() => {
    if (isCinemaView || selectedProperty) return;
    const warm = () => { import('./SalePageV4'); };
    const idle = typeof window.requestIdleCallback === 'function';
    const id = idle ? window.requestIdleCallback(warm, { timeout: 6000 }) : setTimeout(warm, 4000);
    return () => (idle ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, [isCinemaView, selectedProperty]);


  const navTransparent = isCinemaView && navOverHero;

  /**
   * กลับไปบนสุด (ฉากประตูหน้าบ้าน)
   *
   * goTab เรียก jumpTop ให้อยู่แล้ว แต่ตอนอยู่ในฉากเปิดมันไม่พอ
   * เพราะ activeTab เป็น 'home' อยู่แล้ว React จึงไม่ re-render อะไร
   * และเอนจินของฉากเปิดมีตัวดูดเข้าสถานีที่สั่ง window.scrollTo ได้เอง
   * พอเลื่อนขึ้นบนแล้วเกิด event scroll มันจะตั้งเวลาไว้ดูดต่ออีกที
   *
   * จึงย้ำคำสั่งอีกสองจังหวะ หลัง React วาดเสร็จ และหลังพ้นเวลาหน่วงของตัวดูด
   * (SNAP_IDLE = 150ms ใน CinemaHero) เพื่อให้ชนะไม่ว่าอะไรจะแทรกเข้ามา
   */
  const goHomeTop = useCallback(() => {
    const request = ++navigationRequest.current;
    setWatchStory(false);
    goTab('home');
    if (prefersSimpleHome) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    /**
     * บนมือถือฉากเปิดเปิด scroll-snap ของ CSS ไว้ที่ตัว html
     * ซึ่งคอยดูดหน้ากลับไปหาจุดจอดที่ใกล้ที่สุดตลอด และมันชนะ scroll แบบ smooth
     * เลื่อนขึ้นไปได้ไม่ทันถึงบนสุดก็โดนดูดกลับ กลายเป็นกดโลโก้แล้วเหมือนไม่มีอะไรเกิดขึ้น
     * จึงต้องปิด snap ทิ้งชั่วคราวระหว่างเลื่อน แล้วค่อยคืนค่าให้
     *
     * และบนจอสัมผัสใช้เลื่อนแบบทันที ไม่ใช่ smooth
     * เพราะ smooth บนมือถือถูกยกเลิกได้ง่ายมาก แค่นิ้วยังแตะจออยู่ก็หยุดแล้ว
     */
    const root = document.documentElement;
    const prevSnap = root.style.scrollSnapType;
    root.style.scrollSnapType = 'none';

    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
    const toTop = () => {
      if (request === navigationRequest.current) window.scrollTo({ top: 0, left: 0, behavior: coarse ? 'auto' : 'smooth' });
    };

    toTop();
    requestAnimationFrame(toTop);
    /* ย้ำอีกครั้งหลังพ้นเวลาหน่วงของตัวดูดเข้าสถานีใน CinemaHero (SNAP_IDLE = 150ms) */
    setTimeout(toTop, 220);
    setTimeout(() => { toTop(); root.style.scrollSnapType = prevSnap; }, 500);
  }, [goTab, prefersSimpleHome]);

  const goLocations = useCallback(() => {
    navigationRequest.current += 1;
    setSelectedProperty(null);
    setRequestedPropSlug(null);
    setActiveTab('location');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [setSelectedProperty, setRequestedPropSlug, setActiveTab]);

  /**
   * เมนูบ้านทั้งหมดเปิดรายการรวมเหมือนปุ่มหน้าแรกในทุกโหมด
   */
  const onNavTab = useCallback((key) => {
    setIsMenuOpen(false);
    if (key === 'home') { goHomeTop(); return; }
    if (key === 'location') { goLocations(); return; }
    goTab(key);
  }, [goHomeTop, goLocations, goTab]);
  const label = (field, fallback) => visualContent?.[field] || DEFAULT_VISUAL_CONTENT[field] || fallback;

  return (
    <>
      <style>{v4Css}</style>

      <Head>
        <title>{seoMeta.title}</title>
        <meta name="description" content={seoMeta.description} />
        <meta name="robots" content={seoMeta.robots} />
        <link rel="canonical" href={seoMeta.canonicalUrl} />
        <meta property="og:locale" content="th_TH" />
        <meta property="og:type" content={seoMeta.type} />
        <meta property="og:site_name" content={companyInfo?.name || 'STARTUP UP'} />
        <meta property="og:title" content={seoMeta.title} />
        <meta property="og:description" content={seoMeta.description} />
        <meta property="og:url" content={seoMeta.canonicalUrl} />
        <meta property="og:image" content={seoMeta.image} />
        <meta property="og:image:secure_url" content={seoMeta.image} />
        <meta property="og:image:alt" content={seoMeta.imageAlt} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoMeta.title} />
        <meta name="twitter:description" content={seoMeta.description} />
        <meta name="twitter:image" content={seoMeta.image} />
        <meta name="theme-color" content="#0b1f12" />
        <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      </Head>

      <div className={`v4-shell${isVisualEditMode ? ' is-editing' : ''}${simpleHome ? ' is-simple-layout' : ''}`}>

        {/* ---------- ป็อปอัปโปรโมชั่น ---------- */}
        {showPopupModal && activeTab === 'home' && !selectedProperty && !requestedPropSlug && (
          <PromotionPopup key={popupData.imageUrl} imageUrl={popupData.imageUrl} checked={isSnoozeChecked} onChecked={setIsSnoozeChecked} onClose={dismissPopup} />
        )}

        {/* ---------- แถบเมนู ---------- */}
        <header className={`v4-nav${navTransparent ? ' is-ghost' : ''}`}>
          <div className="v4-nav-inner">
            <button
              type="button"
              className={`v4-logo${prefersSimpleHome && isCinemaView ? ' v4-exit-story' : ''}`}
              onClick={goHomeTop}
            >
              {prefersSimpleHome && isCinemaView
                ? <><ChevronLeft size={20} aria-hidden="true" /> กลับหน้าเลือกบ้าน</>
                : companyInfo?.logoUrl
                ? <SmartImage src={getOptimizedImg(companyInfo.logoUrl, 120)}
                    srcSet={[60, 120, 180].map((width, i) => `${getOptimizedImg(companyInfo.logoUrl, width)} ${i + 1}x`).join(', ')}
                    alt={companyInfo?.name || 'STARTUP UP'} width={220} height={156} />
                : <span>{companyInfo?.name || 'STARTUP UP'}</span>}
            </button>

            <nav className="v4-nav-links" aria-label="เมนูหลัก">
              {NAV_TABS.map(tab => (
                <a
                  key={tab.key}
                  href={tab.href || (tab.key === 'home' ? basePath : `${basePath}?tab=${tab.key}`)}
                  className={activeTab === tab.key && !selectedProperty ? 'is-active' : ''}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) return;
                    // In the page editor, a click on the pencil or the text box edits the label, not the link.
                    if (isVisualEditMode && e.target.closest?.('input, [data-edit-control]')) { e.preventDefault(); return; }
                    if (tab.href) {
                      // Leaving the main site would discard unsaved edits.
                      if (isVisualEditMode) e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    onNavTab(tab.key);
                  }}
                >
                  {isVisualEditMode
                    // navAll/navArticles have no saved value yet; without a fallback EditableText renders nothing
                    // and the item disappears in edit mode. Seed it with the label shown to visitors.
                    ? <EditableText tag="span" fieldKey={tab.field} content={{ ...visualContent, [tab.field]: label(tab.field, tab.fallback) }} updateContent={updateVisualContent} isEditMode />
                    : label(tab.field, tab.fallback)}
                </a>
              ))}

              <form
                className={`v4-navsearch${isNavSearchOpen ? ' is-open' : ''}`}
                role="search"
                onSubmit={submitNavSearch}
                /* คลิกที่อื่นแล้วยังไม่ได้พิมพ์อะไร ให้หุบกลับเป็นปุ่มเหมือนเดิม */
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget) && !navSearchText.trim()) closeNavSearch();
                }}
              >
                <input
                  ref={navSearchInputRef}
                  type="text"
                  value={navSearchText}
                  onChange={(e) => setNavSearchText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') closeNavSearch(); }}
                  placeholder="ชื่อโครงการ ทำเล"
                  aria-label="ค้นหาบ้าน"
                  tabIndex={isNavSearchOpen ? 0 : -1}
                  disabled={isVisualEditMode}
                />
                <button type="submit" aria-label="ค้นหา" disabled={isVisualEditMode}>
                  <Search size={18} />
                </button>
              </form>
            </nav>

            <div className="v4-nav-actions">
              {userRole ? (
                <button type="button" className="v4-admin-btn" disabled={isVisualEditMode} onClick={() => setShowAdminPanel(true)}>
                  <Settings size={14} /> ระบบจัดการ
                </button>
              ) : (
                /* ไอคอนบัญชีผู้ใช้ล้วน ๆ ไม่มีคำว่า Admin Login ให้สะดุดตาลูกค้า
                   วางไว้ใน v4-nav-actions ซึ่งไม่ถูกซ่อนบนจอเล็ก จึงกดได้ทุกขนาดจอ */
                <button type="button" className="v4-user-btn" aria-label="เข้าสู่ระบบผู้ดูแล" title="เข้าสู่ระบบผู้ดูแล" onClick={() => setShowLoginModal(true)}>
                  <CircleUserRound size={22} />
                </button>
              )}
              <button type="button" className="v4-burger" aria-label="เมนู" aria-expanded={isMenuOpen} aria-controls="site-mobile-menu" onClick={() => setIsMenuOpen(v => !v)}>
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="v4-mobile-menu" id="site-mobile-menu">
              <form className="v4-msearch" role="search" onSubmit={submitMenuSearch}>
                <input
                  type="text"
                  value={navSearchText}
                  onChange={(e) => setNavSearchText(e.target.value)}
                  placeholder="ค้นหาบ้าน ทำเล หรือโครงการ"
                  aria-label="ค้นหาบ้าน"
                />
                <button type="submit" aria-label="ค้นหา"><Search size={18} /></button>
              </form>
              {NAV_TABS.map(tab => tab.href ? <a key={tab.key} href={tab.href} onClick={(e) => { if (isVisualEditMode) e.preventDefault(); }}>{label(tab.field, tab.fallback)}</a> : (
                <button key={tab.key} type="button" onClick={() => onNavTab(tab.key)}>
                  {label(tab.field, tab.fallback)}
                </button>
              ))}
              {userRole && (
                <>
                  <hr />
                  <button type="button" onClick={() => { setShowAdminPanel(true); setIsMenuOpen(false); }}>เข้าสู่ระบบหลังบ้าน</button>
                </>
              )}
            </div>
          )}
        </header>

        {/* ---------- เนื้อหา ---------- */}
        {publicDataError && <PublicDataNotice />}
        <main className={`v4-main${isCinemaView ? ' is-cinema' : ''}`}>
          {selectedProperty ? (
            <SalePageV4
              onNeedRelated={site.loadRelatedProperties}
              property={selectedProperty}
              companyInfo={companyInfo}
              onBack={() => { setRequestedPropSlug(null); setSelectedProperty(null); window.scrollTo(0, 0); }}
              properties={publicProperties}
              onSelectProp={handleSelectProperty}
              visualContent={visualContent}
              updateVisualContent={updateVisualContent}
              isEditMode={isVisualEditMode}
              openLightbox={openLightbox}
            />
          ) : (
            <>
              {isHomeScene && (
                <>
                  {!requestedPropSlug && (
                    simpleHome ? <MobileHome
                      properties={publicProperties}
                      loading={loading}
                      onSelectProp={handleSelectProperty}
                      onFilter={handleFilterSelect}
                      onSearch={handleGlobalSearch}
                      onShowAll={() => goTab('all')}
                      onShowLocations={goLocations}
                      onWatchStory={() => { setWatchStory(true); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                      visualContent={visualContent}
                      isEditMode={isVisualEditMode}
                    /> : <>
                    <CinemaHero
                      loading={loading}
                      properties={publicProperties}
                      onSelectProp={handleSelectProperty}
                      onSelectLocation={handleFilterSelect}
                      onSearch={handleGlobalSearch}
                      onSelectCategory={handleFilterSelect}
                      companyName={companyInfo?.name || 'STARTUP UP'}
                      tagline={companyInfo?.description || 'จุดเริ่มต้นของคนอยากมีบ้าน'}
                      visualContent={visualContent}
                      updateVisualContent={updateVisualContent}
                      isEditMode={isVisualEditMode}
                      onShowAllHomes={() => goTab('all')}
                      onShowLocations={goLocations}
                    />
                    </>
                  )}
                  {/* เนื้อหาหน้าแรกตัวจริงบนเว็บหลัก : ช่องค้นหา บ้านแยกหมวด
                      และ "ซื้อบ้านกับ StartupUp ดีอย่างไร?" — แก้ได้จากหลังบ้านครบ
                      (HeroSection เดิมไม่ต้องใช้แล้ว เพราะฉากภาพยนตร์ทำหน้าที่แทน)

                      แถบทำเลกับแผนที่หมุดถูกยกขึ้นไปอยู่ในฉากภาพยนตร์แล้ว จึงปิดทั้งคู่ตรงนี้
                      ไม่งั้นจะเห็นของซ้ำสองรอบในหน้าเดียว */}
                  {!requestedPropSlug && <SeoBrowse />}
                  {isWaiting ? <Waiting /> : (
                    <HomeSection
                      showLocationMarquee={false}
                      showMap={false}
                      showSearch={false}
                      showCategorySections={false}
                      properties={publicProperties}
                      loading={loading}
                      onSelectProp={handleSelectProperty}
                      setActiveTab={setActiveTab}
                      onSelectLocation={handleFilterSelect}
                      onSearchCategory={handleFilterSelect}
                      onSearch={handleGlobalSearch}
                      visualContent={visualContent}
                      updateVisualContent={updateVisualContent}
                      onUpdateLocationImage={handleLocationImageUpdate}
                      onRemoveLocationImage={handleRemoveLocationImage}
                      isEditMode={isVisualEditMode}
                    />
                  )}
                </>
              )}

              {!isHomeScene && isWaiting && <Waiting />}


              {activeTab === 'location' && !isWaiting && (
                <LocationListing properties={publicProperties} listing={listing} onSelectProp={handleSelectProperty} isEditMode={isVisualEditMode} />
              )}

              {activeTab === 'all' && !isWaiting && (
                <PropertiesList
                  listing={listing} onListingChange={updateListing} activeTab="all" basePath={basePath}
                  pageHeading="บ้านมือสองรีโนเวท รังสิต ปทุมธานี ทั้งหมด"
                  properties={publicProperties}
                  onSelectProp={handleSelectProperty}
                  visualContent={visualContent}
                  updateVisualContent={updateVisualContent}
                  isEditMode={isVisualEditMode}
                />
              )}

              {activeTab === 'promo' && !isWaiting && (
                <PropertiesList
                  listing={listing} onListingChange={updateListing} activeTab="promo" basePath={basePath}
                  pageHeading={label('navPromo', 'บ้านโปรโมชั่น')}
                  properties={publicProperties}
                  searchParams={{ type: 'promo' }}
                  onSelectProp={handleSelectProperty}
                  visualContent={visualContent}
                  updateVisualContent={updateVisualContent}
                  isEditMode={isVisualEditMode}
                />
              )}

              {activeTab === 'search_result' && !isWaiting && (
                <>
                <PropertiesList
                  key={locationLanding?.slug || 'search'}
                  listing={listing} onListingChange={updateListing} activeTab="search_result" basePath={basePath}
                  locationLanding={locationLanding}
                  properties={publicProperties}
                  searchParams={searchParams}
                  onSelectProp={handleSelectProperty}
                  visualContent={visualContent}
                  updateVisualContent={updateVisualContent}
                  isEditMode={isVisualEditMode}
                />
                {locationLanding && <LocationGuide location={locationLanding} properties={publicProperties} companyInfo={companyInfo} />}
                </>
              )}

              {/* ?tab=location opens the location cards in the shared home scene. */}

              {activeTab === 'calculator' && !isWaiting && (
                <div className="v4-calc-wrap">
                  <CalculatorSection
                    visualContent={visualContent}
                    updateVisualContent={updateVisualContent}
                    isEditMode={isVisualEditMode}
                  />
                </div>
              )}

              {activeTab === 'portfolio' && !isWaiting && (
                <PortfolioSection
                  soldHomes={<SoldHomes properties={publicProperties} listing={listing} eagerCount={companyInfo?.portfolio_years?.length ? 0 : 3} />}
                  listing={listing} onListingChange={updateListing} basePath={basePath}
                  companyInfo={companyInfo}
                  properties={publicProperties}
                  visualContent={visualContent}
                  updateVisualContent={updateVisualContent}
                  isEditMode={isVisualEditMode}
                  openLightbox={openLightbox}
                />
              )}
            </>
          )}
        </main>

        {/* ---------- ท้ายเว็บ ---------- */}
        <footer className={`v4-footer${footerPhoto ? ' has-bg' : ''}`} ref={footerRef}>
          <div className="v4-footer-inner">
            <div>
              <h3>{companyInfo?.name || 'STARTUP UP'}</h3>
              <p>{companyInfo?.description || 'จุดเริ่มต้นของคนอยากมีบ้าน'}</p>
            </div>
            <div className="v4-foot-contact">
              <h4>{label('contactTitle', 'ติดต่อเรา')}</h4>
              <a
                href={OFFICE_MAP_URL}
                target="_blank" rel="noopener noreferrer"
              >{companyInfo?.address}</a>
              <a className="v4-phone" href={`tel:${companyInfo?.phone}`} data-phone-property-id={selectedProperty?.id} data-phone-property-name={[selectedProperty?.project_name, selectedProperty?.house_number].filter(Boolean).join(' ')} data-phone-property-slug={selectedProperty ? generatePropSlug(selectedProperty) : undefined}>โทร {companyInfo?.phone}</a>
              <span>{companyInfo?.email}</span>
            </div>
            <div>
              <h4>{label('followTitle', 'ติดตามเรา')}</h4>
              <div className="v4-social">
                <a href={companyInfo?.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook /></a>
                <a href="https://youtube.com/@startupupofficial" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube /></a>
                <a href={lineContactHref(selectedProperty)} data-contact-property-id={selectedProperty?.id} data-contact-property-name={[selectedProperty?.project_name, selectedProperty?.house_number].filter(Boolean).join(' ')} data-contact-property-slug={selectedProperty ? generatePropSlug(selectedProperty) : undefined} target="_blank" rel="noopener noreferrer" aria-label="LINE"><MessageCircle size={26} /></a>
                <a href="https://www.instagram.com/startupuprealestate/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram /></a>
                <a href="https://www.tiktok.com/@startupupofficial" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Video size={26} /></a>
              </div>
            </div>
          </div>
          <LandingLinks footer />
          <div className="v4-footer-base">
            © {new Date().getFullYear()} {companyInfo?.name || 'Startup Up Real Estate'}. All Rights Reserved.
          </div>
        </footer>
        {showStickyContact && <><div className="md:hidden h-[76px]" aria-hidden="true" /><StickyContact phone={companyInfo.phone} isEditMode={isVisualEditMode} /></>}

        {/* ---------- แถบโหมดแก้ไขหน้าเว็บ ---------- */}
        {isVisualEditMode && (
          <div className="v4-editbar">
            <div className="v4-editbar-info">
              <span className="v4-editbar-chip"><Layout size={16} /> โหมดแก้ไขหน้าตาเว็บไซต์</span>
              <small><Type size={14} /> คลิกไอคอนดินสอเพื่อแก้ข้อความ หรือชี้ที่รูปทำเลเพื่อเปลี่ยนรูป</small>
            </div>
            <div className="v4-editbar-history">
              <button type="button" onClick={undoVisual} disabled={!canUndo}><ChevronLeft size={16} /> Undo</button>
              <button type="button" onClick={redoVisual} disabled={!canRedo}>Redo <ChevronRight size={16} /></button>
            </div>
            <div className="v4-editbar-actions">
              <button type="button" className="v4-ghost" onClick={cancelVisualEdit}>ยกเลิก</button>
              <button type="button" className="v4-save" onClick={saveVisualEdit} disabled={isSavingVisual}>
                {isSavingVisual ? <Loader size={16} className="v4-spin" /> : <Save size={16} />} บันทึกการแก้ไข
              </button>
            </div>
          </div>
        )}

        <CustomAlertModal
          isOpen={globalAlert.isOpen}
          type={globalAlert.type}
          title={globalAlert.title}
          message={globalAlert.message}
          showCancel={globalAlert.showCancel}
          onCancel={globalAlert.onCancel}
          onConfirm={globalAlert.onConfirm}
          confirmText={globalAlert.confirmText}
        />

        {adminEntryPending && !authReady && (
          <div role="status" className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 flex items-center gap-3"><Loader size={20} className="animate-spin" /> กำลังกู้คืนการเข้าสู่ระบบ...</div>
          </div>
        )}
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onGoogleLogin={handleGoogleLogin} />}

        {showAdminPanel && (
          <AdminPanel
            userRole={userRole}
            userEmail={userEmail}
            properties={properties}
            users={authorizedUsers}
            companyInfo={companyInfo}
            popupData={popupData}
            locations={visualContent.locations || DEFAULT_LOCATIONS_DATA}
            onClose={() => setShowAdminPanel(false)}
            onLogout={handleLogout}
            db={db}
            appId={appId}
            enterVisualEditMode={enterVisualEditMode}
            showAlert={site.showGlobalAlert}
            showConfirm={site.showGlobalConfirm}
          />
        )}

        <Lightbox
          isOpen={lightbox.isOpen}
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={closeLightbox}
        />
      </div>
    </>
  );
}

const v4Css = `
.v4-shell {
  --paper: #fdf1e1;
  --paper-soft: #f6efe4;
  --ink: #111411;
  --brand: #0b3d1b;
  --brand-soft: #14512a;
  --line: rgba(11, 61, 27, 0.12);
  --display: Prompt, system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--ink);
  background: var(--paper-soft);
  font-family: Prompt, system-ui, sans-serif;
}
.v4-shell.is-editing { padding-bottom: 96px; }
.v4-shell.is-simple-layout .v4-nav { background: #fdf1e1; border-bottom: 1px solid #d7e0d5; }
.v4-shell.is-simple-layout .v4-mobile-menu :is(button,a) { min-height: 52px; font-size: 18px; }
.v4-shell .v4-nav .v4-logo.v4-exit-story {
  display: flex; align-items: center; gap: 6px; min-height: 48px;
  padding: 8px 10px; border: 1px solid #153d28; border-radius: 10px;
  background: #fffdf8; color: #153d28; font: inherit; font-size: 15px; letter-spacing: normal; text-shadow: none;
  box-shadow: 0 3px 16px #0002; cursor: pointer;
}
.v4-exit-story:focus-visible { outline: 3px solid #98691d; outline-offset: 3px; }

/* หัวข้อทุกส่วนใช้ฟอนต์ชุดใหม่ รวมถึงส่วนที่ยกมาจากเว็บเดิม */
.v4-shell h1, .v4-shell h2, .v4-shell h3,
.v4-shell .np-section-head h2, .v4-shell .np-intro-copy h2 {
  font-family: var(--display);
  font-weight: 500;
  letter-spacing: 0.005em;
}
.v4-shell .np-home { background: var(--paper-soft); }

/* ---------- แถบเมนู ---------- */
/* แถบเมนูลอยอยู่เหนือเนื้อหา ไม่มีพื้นทึบ ไม่มีเส้นคั่น
   ใช้แค่ไล่เฉดจาง ๆ ให้ตัวหนังสืออ่านออก แล้วค่อย ๆ หายไปด้านล่าง */
.v4-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 60;
  border: 0;
  background: linear-gradient(180deg,
    rgba(253, 241, 225, 0.92) 0%,
    rgba(253, 241, 225, 0.62) 58%,
    rgba(253, 241, 225, 0) 100%);
  transition: background 320ms ease;
}
/* ตอนลอยอยู่บนภาพ ใช้เฉดมืดแทน ตัวหนังสือจะได้เป็นสีครีม */
.v4-nav.is-ghost {
  background: linear-gradient(180deg, rgba(5, 18, 9, 0.5) 0%, rgba(5, 18, 9, 0.18) 60%, rgba(5, 18, 9, 0) 100%);
}
.v4-nav-inner {
  max-width: 1400px; margin: 0 auto; padding: 0 28px;
  height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
.v4-logo {
  display: inline-flex; align-items: center; border: 0; background: none;
  padding: 0; cursor: pointer; color: var(--brand);
  /* กันแตะพลาดบนมือถือ ให้เป้ากว้างพอตามเกณฑ์ และตัดหน่วง 300ms ของเบราว์เซอร์ทิ้ง */
  min-width: 44px; min-height: 44px; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  font-family: var(--display); font-size: 22px; font-weight: 300; letter-spacing: 0.2em;
  white-space: nowrap;
}
.v4-logo img {
  height: 42px; width: auto; object-fit: contain; display: block;
  background: transparent; padding: 4px 6px; box-sizing: content-box;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.55));
}
.v4-logo:disabled { opacity: 0.5; cursor: default; }
.v4-nav.is-ghost .v4-logo { color: #fdf1e1; text-shadow: 0 2px 16px rgba(0,0,0,0.4); }
/* Keep the uploaded logo transparent on every page; only the shadow varies. */
.v4-nav.is-ghost .v4-logo img {
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35)); background: transparent;
}

.v4-nav-links { display: flex; align-items: center; gap: clamp(14px, 1.5vw, 28px); }
.v4-nav-links a {
  position: relative; color: var(--brand); text-decoration: none;
  font-size: 16px; font-weight: 400; white-space: nowrap; padding: 6px 0;
  transition: opacity 200ms ease;
}
.v4-nav-links a::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: currentColor; transform: scaleX(0); transform-origin: 0 50%;
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.v4-nav-links a:hover::after, .v4-nav-links a.is-active::after { transform: scaleX(1); }
.v4-nav.is-ghost .v4-nav-links a { color: rgba(253, 241, 225, 0.92); text-shadow: 0 2px 16px rgba(0,0,0,0.4); }

/**
 * ปุ่มแว่นขยายท้ายเมนู กดแล้วช่องพิมพ์คลี่ออกทางซ้ายตรงนั้นเลย
 * ไม่เปิดแผ่นซ้อนใหม่ หน้าเว็บจึงไม่ต้องโหลดอะไรเพิ่ม
 * ตอนหุบช่องกว้าง 0 และปิดรับคลิก เพื่อไม่ให้ดักโฟกัสตอนกด Tab
 */
.v4-navsearch {
  display: flex; align-items: center; gap: 6px;
  border-bottom: 1px solid transparent;
  transition: border-color 260ms ease;
}
.v4-navsearch.is-open { border-bottom-color: currentColor; }
.v4-navsearch input {
  width: 0; padding: 0; border: 0; background: none; outline: none;
  font: inherit; font-size: 15px; color: var(--brand);
  opacity: 0; pointer-events: none;
  transition: width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
}
.v4-navsearch.is-open input {
  width: clamp(150px, 16vw, 230px); opacity: 1; pointer-events: auto;
}
.v4-navsearch input::placeholder { color: rgba(17, 20, 17, 0.38); }
.v4-navsearch button {
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: none; padding: 4px; cursor: pointer;
  color: var(--brand); transition: opacity 200ms ease;
}
.v4-navsearch button:hover { opacity: 0.6; }
.v4-navsearch button:disabled { opacity: 0.4; cursor: not-allowed; }
.v4-nav.is-ghost .v4-navsearch { text-shadow: 0 2px 16px rgba(0, 0, 0, 0.4); }
.v4-nav.is-ghost .v4-navsearch input,
.v4-nav.is-ghost .v4-navsearch button { color: #fdf1e1; }
.v4-nav.is-ghost .v4-navsearch input::placeholder { color: rgba(253, 241, 225, 0.6); }

.v4-nav-actions { display: flex; align-items: center; gap: 12px; }
.v4-admin-btn {
  display: inline-flex; align-items: center; gap: 8px; border: 0; cursor: pointer;
  font-family: inherit; font-size: 14px; white-space: nowrap; background: none;
}
.v4-admin-btn {
  padding: 8px 18px; border-radius: 999px;
  border: 1px solid var(--brand); color: var(--brand); background: transparent;
  transition: background 220ms ease, color 220ms ease;
}
.v4-admin-btn:hover { background: var(--brand); color: var(--paper); }
.v4-admin-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.v4-nav.is-ghost .v4-admin-btn { border-color: rgba(253,241,225,0.7); color: #fdf1e1; }
.v4-nav.is-ghost .v4-admin-btn:hover { background: #fdf1e1; color: var(--brand); }

.v4-user-btn {
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: none; padding: 4px; cursor: pointer;
  color: rgba(17, 20, 17, 0.45); transition: color 220ms ease;
}
.v4-user-btn:hover { color: var(--brand); }
.v4-nav.is-ghost .v4-user-btn { color: rgba(253, 241, 225, 0.72); }
.v4-nav.is-ghost .v4-user-btn:hover { color: #fdf1e1; }

.v4-burger { display: none; border: 0; background: none; cursor: pointer; color: inherit; padding: 6px; }
.v4-nav.is-ghost .v4-burger { color: #fdf1e1; }

.v4-mobile-menu {
  display: flex; flex-direction: column; gap: 4px; padding: 12px 28px 20px;
  background: var(--paper); border: 0;
  box-shadow: 0 18px 40px rgba(11, 61, 27, 0.14);
}
.v4-mobile-menu button, .v4-mobile-menu > a {
  border: 0; background: none; text-align: left; padding: 10px 0;
  font: inherit; font-size: 16px; color: var(--brand); cursor: pointer;
}
.v4-mobile-menu hr { border: 0; border-top: 1px solid var(--line); margin: 6px 0; }
.v4-msearch {
  display: flex; align-items: center; gap: 8px; margin: 2px 0 8px;
  padding: 10px 16px; border: 1px solid var(--line); border-radius: 999px; background: #fff;
}
.v4-msearch input {
  flex: 1 1 auto; min-width: 0; border: 0; background: none; outline: none;
  font: inherit; font-size: 15px; color: var(--brand);
}
.v4-msearch input::placeholder { color: rgba(17, 20, 17, 0.38); }
.v4-msearch button {
  display: inline-flex; border: 0; background: none; padding: 0;
  color: var(--brand); cursor: pointer;
}

@media (max-width: 1024px) {
  .v4-nav-links { display: none; }
  .v4-burger { display: inline-flex; }
  .v4-admin-btn span { display: none; }
}
@media (min-width: 1025px) { .v4-mobile-menu { display: none; } }

/* ---------- เนื้อหา ---------- */
.v4-main { flex: 1 1 auto; padding-top: 76px; }
.v4-main.is-cinema { padding-top: 0; }
.v4-calc-wrap { padding: 72px 20px; background: var(--paper-soft); }

/* ---------- ปรับเนื้อหาเดิมจากเว็บหลักให้เข้าชุดกับดีไซน์ใหม่ ----------
   ทุก selector อยู่ใต้ .v4-main จึงไม่กระทบหน้าเดิมที่ / เลย */
.v4-main > main,
.v4-main > div { background: var(--paper-soft); }

/* พื้นเทาเย็น ๆ ของบล็อก whyUs และแถบต่าง ๆ → เปลี่ยนเป็นครีมอุ่น */
.v4-main .bg-gray-50 { background-color: #fbf6ed; }
/* ยกเว้นช่องกรอกที่อ่านอย่างเดียว (ระยะเวลาในเครื่องคำนวณสินเชื่อ)
   ครีมทำให้ดูเหมือนช่องพัง ไม่เข้าชุดกับช่องอื่นที่เป็นขาว */
.v4-main .input-modern.bg-gray-50 { background-color: #fff; border-color: #e2e8f0; }
.v4-main .border-gray-100 { border-color: rgba(11, 61, 27, 0.1); }

/* หัวข้อทุกระดับใช้ฟอนต์ชุดใหม่ และหนักขึ้นนิดให้อ่านง่ายบนพื้นครีม */
.v4-main h2, .v4-main h3, .v4-main h4 {
  font-family: var(--display);
  letter-spacing: 0.005em;
}
.v4-main .text-brand-green { color: var(--brand); }

/* ช่องค้นหา */
.v4-main form input[type="text"] {
  background: #fffdf9;
  border-color: rgba(11, 61, 27, 0.14);
  box-shadow: 0 14px 34px rgba(11, 61, 27, 0.08);
}

/* แผนที่หมุด */
.v4-main .leaflet-container {
  border-radius: 22px;
  box-shadow: 0 22px 54px rgba(11, 61, 27, 0.16);
}

.v4-loading {
  min-height: 70vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px; color: var(--brand);
}
.v4-loading p { color: rgba(17,20,17,0.5); letter-spacing: 0.08em; font-weight: 300; }
.v4-spin { animation: v4spin 1s linear infinite; }
@keyframes v4spin { to { transform: rotate(360deg); } }

/* ---------- ป็อปอัป ---------- */
.v4-popup-backdrop {
  position: fixed; inset: 0; z-index: 200; display: flex; align-items: center;
  justify-content: center; padding: 16px; background: rgba(6, 20, 10, 0.72);
  backdrop-filter: blur(4px);
}
.v4-popup {
  background: var(--paper); border-radius: 22px; overflow: hidden;
  max-width: 520px; width: 100%; box-shadow: 0 40px 90px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
}
.v4-popup-img { width: 100%; height: auto; max-height: 78vh; object-fit: contain; display: block; }
.v4-promotion-dialog { border: 0; padding: 0; margin: auto; width: min(520px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); color: var(--ink); }
.v4-promotion-dialog:not([open]) { display: none; }
.v4-promotion-dialog::backdrop { background: rgba(6,20,10,.72); }
.v4-promotion-dialog .v4-popup-img { min-height: 0; flex-shrink: 1; }
.v4-promotion-dialog .v4-popup-foot { flex-shrink: 0; }
.v4-popup-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 18px; border-top: 1px solid var(--line); font-size: 14px;
}
.v4-popup-foot label { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; color: rgba(17,20,17,0.7); }
.v4-popup-foot button {
  border: 0; cursor: pointer; font: inherit; font-size: 14px;
  padding: 8px 20px; border-radius: 999px; background: var(--brand); color: var(--paper);
}

/* ---------- ท้ายเว็บ ---------- */
/**
 * พื้นหลังท้ายเว็บ — ภาพครอบครัวเล่นในสนามหลังบ้าน ซ้อนใต้ม่านสีเขียวเข้ม
 * ม่านจำเป็น ไม่ใช่แค่ความสวย ถ้าไม่มี ตัวหนังสือครีมจะจมหายไปกับหญ้าที่โดนแดด
 * ไล่เฉดเข้มหัว-ท้าย อ่อนตรงกลาง ภาพจึงยังเห็นเป็นภาพ ไม่ใช่แค่พื้นเขียวด่าง
 *
 * ต้นฉบับเป็น PNG 2.4 MB หนักเกินไปสำหรับพื้นหลัง แปลงเป็น webp เหลือ 153 KB
 * แล้วทำตัวเล็ก 900px (48 KB) ไว้ให้มือถือ ซึ่งจอไม่กว้างพอจะเห็นความต่างอยู่แล้ว
 */
.v4-footer {
  margin-top: auto; color: var(--paper); position: relative; z-index: 30;
  background-color: #0b1f12;
  background-image:
    linear-gradient(180deg,
      rgba(6, 20, 10, 0.72) 0%,
      rgba(6, 20, 10, 0.64) 38%,
      rgba(6, 20, 10, 0.88) 72%,
      rgba(6, 20, 10, 0.94) 100%),
    var(--footer-photo, none);
  background-position: center top;
  background-repeat: no-repeat;
  /**
   * กว้างเต็มจอ สูงตามสัดส่วนจริงของภาพ ไม่ตัดอะไรทิ้งเลย
   * แล้วบังคับความสูงกล่องให้เท่ากับภาพพอดี ภาพจึงเต็มใบไม่มีขอบเขียวโผล่
   *
   * ใช้ cqw ไม่ใช่ vw เพราะ vw นับรวมความกว้างแถบเลื่อนด้วย
   * กล่องจะสูงเกินภาพไปสิบกว่าพิกเซล เห็นเป็นแถบเขียวบาง ๆ ที่ก้น
   */
  container-type: inline-size;
  background-size: 100% auto;
  min-height: calc(100cqw / 2.3801);
  /**
   * ดันเนื้อหาลงไปชิดก้น ไม่ใช่จัดกึ่งกลาง
   * กล่องสูงกว่าตัวข้อความเกือบสามเท่า ถ้าจัดกึ่งกลางจะเหลือที่ว่างค้างใต้ข้อความเป็นท่อน
   * ดันลงล่างแล้วที่ว่างไปกองอยู่ด้านบนแทน ซึ่งเป็นส่วนที่มีเต็นท์กับกลุ่มคนอยู่พอดี
   * ม่านจึงจางที่หัวให้เห็นภาพ แล้วค่อยเข้มที่ก้นตรงที่ตัวหนังสือทับอยู่
   */
  display: flex; flex-direction: column; justify-content: flex-end;
}
/**
 * จอแคบกลับไปใช้ cover ตามเดิม
 * ภาพกว้าง 2.38:1 ถ้าโชว์เต็มใบบนมือถือจะเหลือแถบสูงแค่ราว 160px
 * ขณะที่ข้อความท้ายเว็บสูงกว่า 500px กลายเป็นภาพแปะหัวแล้วเขียวโล่งทั้งท่อน
 */
@media (max-width: 900px) {
  .v4-footer {
    background-image:
      linear-gradient(180deg, rgba(6, 20, 10, 0.93) 0%, rgba(6, 20, 10, 0.8) 42%, rgba(6, 20, 10, 0.92) 100%),
      var(--footer-photo, none);
    background-size: cover;
    background-position: center 35%;
    min-height: 0;
  }
}

/* The footer photo is attached only when the footer is near the screen (SiteV4 adds .has-bg),
   so it never competes with the first house photo for bandwidth. */
.v4-footer.has-bg { --footer-photo: url('/footer-bg.webp'); }
@media (max-width: 900px) { .v4-footer.has-bg { --footer-photo: url('/footer-bg-sm.webp'); } }
/**
 * width: 100% ขาดไม่ได้
 * พอ .v4-footer กลายเป็น flex คอลัมน์ ลูกทั้งสองก้อนก็เป็น flex item
 * margin: 0 auto ของ flex item คือ auto margin ตามแกนขวาง ซึ่งลบล้าง stretch ทิ้ง
 * กล่องจึงหดเหลือเท่าเนื้อหา คอลัมน์ในตารางเลยกว้างไม่เท่ากันและกองอยู่กลางจอ
 */
.v4-footer-inner {
  width: 100%; max-width: 1400px; margin: 0 auto; padding: 64px 28px 40px;
  text-align: center;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 40px;
}
.v4-footer h3 {
  margin: 0 0 16px; font-size: 36px; font-weight: 300; letter-spacing: 0.2em;
  /* letter-spacing เติมช่องว่างท้ายตัวอักษรตัวสุดท้ายด้วย พอจัดกึ่งกลางจะเห็นเยื้องไปทางซ้าย
     ดัน text-indent เท่ากันกลับเข้าไป บรรทัดจึงอยู่กลางจริง */
  text-indent: 0.2em;
  font-family: var(--display); text-transform: uppercase;
}
.v4-footer h4 {
  margin: 0 0 18px; font-size: 17px; font-weight: 500; text-indent: 0.16em;
  letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.75;
}
.v4-footer p, .v4-footer span, .v4-footer a {
  display: block; color: rgba(253, 241, 225, 0.78); font-size: 18px;
  line-height: 1.7; text-decoration: none; margin-bottom: 6px;
}
.v4-footer a:hover { color: #fff; text-decoration: underline; }
.v4-footer .v4-phone { font-size: 25px; color: var(--paper); margin: 12px 0; }
/**
 * ช่องติดต่อชิดซ้าย ไม่ตามคอลัมน์อื่นที่จัดกึ่งกลาง
 * ที่อยู่ยาวจนตกบรรทัด ถ้าจัดกึ่งกลางจะได้ขอบซ้ายเป็นฟันปลา อ่านสะดุด
 * ก้อนทั้งก้อนยังถูกจัดกึ่งกลางในคอลัมน์อยู่ กว้างเท่าบรรทัดที่ยาวที่สุดเท่านั้น
 * จึงไม่ลอยไปติดขอบคอลัมน์จนดูหลุดจากอีกสองช่อง
 */
.v4-foot-contact { text-align: left; width: fit-content; margin: 0 auto; }
.v4-foot-contact h4 { text-indent: 0; }
.v4-social { display: flex; justify-content: center; gap: 18px; margin-top: 6px; }
.v4-social a { margin: 0; opacity: 0.8; transition: opacity 200ms ease, transform 200ms ease; }
.v4-social a:hover { opacity: 1; transform: translateY(-2px); }
.v4-footer-base {
  width: 100%; max-width: 1400px; margin: 0 auto; padding: 20px 28px 32px;
  border-top: 1px solid rgba(253, 241, 225, 0.18);
  text-align: center; font-size: 15px; letter-spacing: 0.05em; opacity: 0.65;
}

/* ---------- แถบโหมดแก้ไข ---------- */
.v4-editbar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 16px; padding: 14px 22px; background: #0f172a; color: #fff;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.35);
}
.v4-editbar-info { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.v4-editbar-chip {
  display: inline-flex; align-items: center; gap: 8px;
  background: #2563eb; padding: 7px 14px; border-radius: 10px; font-size: 14px;
}
.v4-editbar-info small { color: #94a3b8; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
.v4-editbar-history { display: flex; gap: 2px; background: #1e293b; padding: 4px; border-radius: 10px; }
.v4-editbar-history button {
  display: inline-flex; align-items: center; gap: 6px; border: 0; cursor: pointer;
  background: none; color: inherit; font: inherit; font-size: 14px;
  padding: 7px 14px; border-radius: 7px;
}
.v4-editbar-history button:hover:not(:disabled) { background: #334155; }
.v4-editbar-history button:disabled { opacity: 0.3; cursor: not-allowed; }
.v4-editbar-actions { display: flex; gap: 12px; }
.v4-editbar-actions button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; cursor: pointer; font: inherit; font-size: 14px;
  padding: 11px 26px; border-radius: 999px;
}
.v4-ghost { background: #334155; color: #fff; }
.v4-save { background: var(--brand); color: #fff; }
.v4-save:disabled { opacity: 0.5; cursor: not-allowed; }
`;
