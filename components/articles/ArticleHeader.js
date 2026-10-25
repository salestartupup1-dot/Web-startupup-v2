/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Native links keep articles independent of the property catalogue. */
import { useEffect, useRef, useState } from 'react';
import { Menu, Search, Settings, X } from 'lucide-react';
import { SITE_LOGO_URL, SITE_NAV_TABS, siteTabHref } from '../../lib/siteNavigation';
import styles from './ArticleHeader.module.css';

const logoImage = width => SITE_LOGO_URL.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);

function SearchFields() {
  return <><input type="hidden" name="tab" value="search_result" /><input type="hidden" name="sType" value="keyword" /></>;
}

export default function ArticleHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const headerRef = useRef(null);
  const searchRef = useRef(null);
  const searchButtonRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const outside = event => {
      if (!headerRef.current?.contains(event.target)) { setMenuOpen(false); setSearchOpen(false); }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen, searchOpen]);

  const escape = event => {
    if (event.key !== 'Escape') return;
    if (menuOpen) { setMenuOpen(false); menuButtonRef.current?.focus(); }
    else if (searchOpen) { setSearchOpen(false); searchButtonRef.current?.focus(); }
  };
  const submitSearch = event => {
    if (!searchOpen) {
      event.preventDefault();
      setSearchOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    } else if (!keyword.trim()) { event.preventDefault(); searchRef.current?.focus(); }
  };
  const links = () => SITE_NAV_TABS.map(tab => (
    <a key={tab.key} href={siteTabHref(tab)} aria-current={tab.key === 'articles' ? 'page' : undefined}
      onClick={() => setMenuOpen(false)}>{tab.fallback}</a>
  ));

  return <header ref={headerRef} className={styles.header} onKeyDown={escape}>
    <div className={styles.inner}>
      <a href="/" className={styles.logo} aria-label="Startup Up กลับหน้าหลัก">
        <img src={logoImage(120)} srcSet={[60, 120, 180].map((width, i) => `${logoImage(width)} ${i + 1}x`).join(', ')}
          alt="Startup Up" width={220} height={156} decoding="async" />
      </a>
      <nav className={styles.links} aria-label="เมนูหลัก">
        {links()}
        <form action="/" method="get" role="search" onSubmit={submitSearch}
          className={`${styles.search}${searchOpen ? ` ${styles.searchOpen}` : ''}`}>
          <SearchFields />
          <input ref={searchRef} type="search" name="sValue" value={keyword} onChange={event => setKeyword(event.target.value)}
            placeholder="ชื่อโครงการ ทำเล" aria-label="ค้นหาบ้าน" disabled={!searchOpen} />
          <button ref={searchButtonRef} type="submit" aria-label="ค้นหา" aria-expanded={searchOpen}><Search size={18} aria-hidden="true" /></button>
        </form>
      </nav>
      <div className={styles.actions}>
        <a className={styles.manage} href="/?admin=1"><Settings size={14} aria-hidden="true" /> ระบบจัดการ</a>
        <button ref={menuButtonRef} type="button" className={styles.burger} aria-label="เมนู"
          aria-expanded={menuOpen} aria-controls="article-mobile-menu" onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
    </div>
    {menuOpen && <nav id="article-mobile-menu" className={styles.mobileMenu} aria-label="เมนูหลักมือถือ">
      <form action="/" method="get" role="search" onSubmit={event => { if (!keyword.trim()) event.preventDefault(); }}>
        <SearchFields />
        <input type="search" name="sValue" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="ค้นหาบ้าน ทำเล หรือโครงการ" aria-label="ค้นหาบ้าน" />
        <button type="submit" aria-label="ค้นหา"><Search size={18} aria-hidden="true" /></button>
      </form>
      {links()}
    </nav>}
  </header>;
}
