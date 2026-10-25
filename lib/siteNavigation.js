import { ARTICLES_PATH } from './articleCatalogue';

export const SITE_LOGO_URL = 'https://res.cloudinary.com/dm2wr55r5/image/upload/v1790151670/pljolp7kwd6ulupq0mvf.png';
export const SITE_HERO_POSTER_URL = '/home-media/v2/hero-poster.avif';

export const SITE_NAV_TABS = [
  { key: 'home', fallback: 'หน้าหลัก', field: 'navHome' },
  { key: 'location', fallback: 'ทำเล', field: 'navLocation' },
  { key: 'all', fallback: 'บ้านทั้งหมด', field: 'navAll' },
  { key: 'promo', fallback: 'บ้านโปรโมชั่น', field: 'navPromo' },
  { key: 'calculator', fallback: 'คำนวณสินเชื่อ', field: 'navCalc' },
  { key: 'portfolio', fallback: 'ผลงาน', field: 'navPortfolio' },
  { key: 'articles', fallback: 'บทความ', field: 'navArticles', href: ARTICLES_PATH },
];

export const siteTabHref = tab => tab.href || (tab.key === 'home' ? '/' : `/?tab=${tab.key}`);
