import { makePropertySlug } from './firestorePublic';
import { isPartnerProperty } from './propertyOwners';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.startupup-real-estate.com').replace(/\/+$/, '');
export const SITE_NAME = 'STARTUP UP';
export const DEFAULT_SITE_DESCRIPTION = 'รวมบ้านมือสองรีโนเวทพร้อมอยู่ ย่านรังสิต คลองหลวง ลำลูกกา ปทุมธานี พร้อมบริการยื่นสินเชื่อและดูแลจนถึงวันโอน';
const DEFAULT_COMPANY_LOGO = 'https://res.cloudinary.com/dm2wr55r5/image/upload/v1790151670/pljolp7kwd6ulupq0mvf.png';
// Matte transparent white logos before JPEG conversion. Keep the whole logo
// inside the central square so LINE's small thumbnail can crop it safely.
const COMPANY_SHARE_TRANSFORM = 'c_limit,w_520,h_420/c_lpad,w_1200,h_630,b_rgb:123b2c/f_jpg,q_90';
export const DEFAULT_OG_IMAGE = DEFAULT_COMPANY_LOGO.replace('/upload/', `/upload/${COMPANY_SHARE_TRANSFORM}/`);

const THB = 'THB';

export const cleanText = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

export const toAbsoluteUrl = (path = '/') => {
  try {
    return new URL(path, `${SITE_URL}/`).href;
  } catch {
    return `${SITE_URL}/`;
  }
};

export const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export const safeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export const getNumber = (value) => {
  const number = Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
};

export const formatPrice = (value) => {
  const number = getNumber(value);
  return number ? number.toLocaleString('th-TH') : cleanText(value);
};

export const getPropertyPath = (property) => {
  const slug = makePropertySlug(property);
  return slug ? `/?property=${slug}` : '/';
};

export const getPropertyUrl = (property) => toAbsoluteUrl(getPropertyPath(property));

// บ้าน Partner ไม่ขึ้นในเว็บ จึงไม่ต้องอยู่ใน sitemap และให้ noindex ไว้ (ลิงก์ตรงยังเปิดดูได้)
export const isIndexableProperty = (property) => Boolean(
  property
    && makePropertySlug(property)
    && property.badge !== 'Sold Out'
    && !isPartnerProperty(property)
);

export const getTimestampDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const formatSitemapDate = (value) => {
  const date = getTimestampDate(value);
  return date ? date.toISOString() : '';
};

export const getPropertyLastModified = (property) => (
  property?.updatedAt
  || property?.createdAt
  || property?.publishedAt
  || null
);

export const getPropertyImage = (property) => {
  const image = Array.isArray(property?.images) && property.images.length > 0
    ? property.images[0]
    : property?.imageUrl;
  return cleanText(image) || DEFAULT_OG_IMAGE;
};

export const getSeoImage = (imageUrl) => {
  const image = cleanText(imageUrl) || DEFAULT_OG_IMAGE;
  if (image === DEFAULT_OG_IMAGE) return image;
  if (image.includes('cloudinary.com') && image.includes('/upload/')) {
    return image.replace('/upload/', '/upload/f_jpg,q_auto,w_1200,h_630,c_limit/');
  }
  return image;
};

export const getCompanyShareImage = (logoUrl) => {
  const image = cleanText(logoUrl) || DEFAULT_COMPANY_LOGO;
  if (image === DEFAULT_OG_IMAGE) return image;
  if (image.includes('cloudinary.com') && image.includes('/upload/')) {
    return image.replace('/upload/', `/upload/${COMPANY_SHARE_TRANSFORM}/`);
  }
  return image;
};

export const getCompanyName = (companyInfo) => cleanText(companyInfo?.name) || SITE_NAME;

export const getPropertyDisplayName = (property) => cleanText([
  property?.category,
  property?.project_name,
  property?.house_number ? `บ้านเลขที่ ${property.house_number}` : '',
].filter(Boolean).join(' ')) || 'บ้านพร้อมอยู่';

export const getPropertyTitle = (property, companyInfo) => {
  const companyName = getCompanyName(companyInfo);
  const location = cleanText(property?.main_location || property?.district);
  const titleParts = [getPropertyDisplayName(property), location].filter(Boolean);
  return `${titleParts.join(' ')} | ${companyName}`;
};

export const getPropertyDescription = (property) => {
  const location = cleanText([
    property?.main_location || property?.district,
    property?.sub_location || property?.subdistrict,
    property?.province,
  ].filter(Boolean).join(' '));
  const details = [
    cleanText(property?.category),
    location,
    property?.bedrooms ? `${property.bedrooms} ห้องนอน` : '',
    property?.bathrooms ? `${property.bathrooms} ห้องน้ำ` : '',
    property?.area_wah ? `${property.area_wah} ตร.ว.` : '',
  ].filter(Boolean);
  const price = formatPrice(property?.price);
  const priceText = price ? ` ราคา ${price} บาท` : '';

  return cleanText(`${details.join(' ')}${priceText} พร้อมบริการสินเชื่อและดูแลจนถึงวันโอน`) || DEFAULT_SITE_DESCRIPTION;
};

export const buildPageSeo = ({ selectedProperty, activeTab, searchParams, companyInfo }) => {
  const companyName = getCompanyName(companyInfo);
  const logo = getCompanyShareImage(companyInfo?.logoUrl);
  const base = {
    title: `${companyName} | จุดเริ่มต้นของคนอยากมีบ้าน`,
    description: DEFAULT_SITE_DESCRIPTION,
    canonicalUrl: toAbsoluteUrl('/'),
    image: logo,
    imageAlt: companyName,
    robots: 'index,follow',
    type: 'website',
  };

  if (selectedProperty) {
    const indexable = isIndexableProperty(selectedProperty);
    return {
      ...base,
      title: getPropertyTitle(selectedProperty, companyInfo),
      description: getPropertyDescription(selectedProperty),
      canonicalUrl: getPropertyUrl(selectedProperty),
      image: getSeoImage(getPropertyImage(selectedProperty)),
      imageAlt: getPropertyDisplayName(selectedProperty),
      robots: indexable ? 'index,follow' : 'noindex,follow',
      type: 'product',
    };
  }

  if (activeTab === 'promo') {
    return {
      ...base,
      title: `โปรโมชั่นบ้านพร้อมอยู่ | ${companyName}`,
      description: 'รวมบ้านโปรโมชัน บ้านรีโนเวทพร้อมอยู่ ทำเลรังสิต คลองหลวง ลำลูกกา และปทุมธานี',
      canonicalUrl: toAbsoluteUrl('/?tab=promo'),
    };
  }

  if (activeTab === 'location') {
    return {
      ...base,
      title: `ค้นหาบ้านตามทำเล | ${companyName}`,
      description: 'ค้นหาบ้านตามทำเลยอดนิยม ทั้งรังสิต คลองหลวง ลำลูกกา ปทุมธานี กรุงเทพฯ นนทบุรี และพื้นที่ใกล้เคียง',
      canonicalUrl: toAbsoluteUrl('/?tab=location'),
    };
  }

  if (activeTab === 'calculator') {
    return {
      ...base,
      title: `คำนวณสินเชื่อบ้านเบื้องต้น | ${companyName}`,
      description: 'ทดลองคำนวณค่างวดสินเชื่อบ้านเบื้องต้นก่อนเลือกซื้อบ้าน พร้อมทีมงานช่วยดูแลเรื่องสินเชื่อ',
      canonicalUrl: toAbsoluteUrl('/?tab=calculator'),
    };
  }

  if (activeTab === 'portfolio') {
    return {
      ...base,
      title: `ผลงานการขายบ้าน | ${companyName}`,
      description: 'ผลงานบ้านที่ขายแล้วและตัวอย่างบ้านที่ Startup Up ดูแลให้ลูกค้าตั้งแต่เลือกบ้านจนถึงวันโอน',
      canonicalUrl: toAbsoluteUrl('/?tab=portfolio'),
    };
  }

  if (activeTab === 'search_result' && searchParams?.value) {
    const safeValue = cleanText(searchParams.value);
    return {
      ...base,
      title: `ค้นหาบ้าน ${safeValue} | ${companyName}`,
      description: `ผลการค้นหาบ้าน ${safeValue} จาก ${companyName}`,
      canonicalUrl: toAbsoluteUrl(`/?tab=search_result&sType=${encodeURIComponent(searchParams.type || '')}&sValue=${encodeURIComponent(safeValue)}`),
      robots: 'noindex,follow',
    };
  }

  return base;
};

export const buildLocalBusinessJsonLd = (companyInfo) => {
  const sameAs = [
    companyInfo?.facebook,
    companyInfo?.line,
    'https://www.instagram.com/startupuprealestate/',
    'https://youtube.com/@startupupofficial',
    'https://www.tiktok.com/@startupupofficial',
  ].map(cleanText).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE_URL}/#organization`,
    name: getCompanyName(companyInfo),
    url: SITE_URL,
    logo: cleanText(companyInfo?.logoUrl) || DEFAULT_COMPANY_LOGO,
    image: getCompanyShareImage(companyInfo?.logoUrl),
    description: cleanText(companyInfo?.description) || DEFAULT_SITE_DESCRIPTION,
    telephone: cleanText(companyInfo?.phone),
    email: cleanText(companyInfo?.email),
    address: cleanText(companyInfo?.address),
    sameAs,
  };
};

export const buildWebSiteJsonLd = (companyInfo) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: getCompanyName(companyInfo),
  url: SITE_URL,
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/?tab=search_result&sType=keyword&sValue={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

export const buildPropertyJsonLd = (property, companyInfo) => {
  if (!property || property._detailsPending) return null;

  const price = getNumber(property.price);
  const offer = {
    '@type': 'Offer',
    url: getPropertyUrl(property),
    priceCurrency: THB,
    availability: property.badge === 'Sold Out'
      ? 'https://schema.org/SoldOut'
      : 'https://schema.org/InStock',
    seller: { '@id': `${SITE_URL}/#organization` },
  };

  if (price) offer.price = price;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${getPropertyUrl(property)}#property`,
    name: getPropertyDisplayName(property),
    description: getPropertyDescription(property),
    image: [getSeoImage(getPropertyImage(property))],
    category: cleanText(property.category),
    brand: { '@id': `${SITE_URL}/#organization` },
    offers: offer,
  };
};

export const buildStructuredData = ({ companyInfo, selectedProperty }) => (
  [
    buildLocalBusinessJsonLd(companyInfo || {}),
    buildWebSiteJsonLd(companyInfo || {}),
    buildPropertyJsonLd(selectedProperty, companyInfo || {}),
  ].filter(Boolean)
);
