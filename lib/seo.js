import { makePropertySlug } from './firestorePublic.js';
import { propertyPath } from './propertyRoutes.js';
import { isPartnerProperty } from './propertyOwners.js';
import { inventoryLabel, primaryPropertyLocation, availableInLocation, isLandingIndexable } from './websiteInventory.js';
import { seoLocationFromSearch, locationPath } from './seoLocations.js';
import { listingHref, isListingTab } from './listingPagination.js';

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
  return propertyPath(property);
};

export const getPropertyUrl = (property) => toAbsoluteUrl(getPropertyPath(property));

// บ้าน Partner ไม่ขึ้นในเว็บ จึงไม่ต้องอยู่ใน sitemap และให้ noindex ไว้ (ลิงก์ตรงยังเปิดดูได้)
export const isIndexableProperty = (property) => Boolean(
  property
    && makePropertySlug(property)
    && property.badge !== 'Sold Out'
    && !['reserved', 'sold'].includes(property.inventoryState)
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

export const getPropertyHeading = property => cleanText(property?.project_name) || 'รายละเอียดบ้าน';

export const getPropertyTitle = (property, companyInfo) => {
  const companyName = getCompanyName(companyInfo);
  const location = cleanText(property?.main_location || property?.district);
  const price = formatPrice(property?.price);
  const titleParts = [cleanText([property?.category, property?.project_name].filter(Boolean).join(' ')), location, price ? `${price} บาท` : ''].filter(Boolean);
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

  return cleanText(`${details.join(' ')}${priceText} ${inventoryLabel(property)} สอบถามรายละเอียดและนัดชมบ้านทางโทรหรือ LINE`) || DEFAULT_SITE_DESCRIPTION;
};

const buildUnpaginatedSeo = ({ selectedProperty, activeTab, searchParams, companyInfo, properties = [] }) => {
  const companyName = getCompanyName(companyInfo);
  const logo = getCompanyShareImage(companyInfo?.logoUrl);
  const base = {
    title: `บ้านมือสองรีโนเวท รังสิต ปทุมธานี | ${companyName}`,
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
      type: 'website',
    };
  }

  if (activeTab === 'all') return { ...base, title: `บ้านมือสอง บ้านเดี่ยว ทาวน์เฮาส์ บ้านแฝด | ${companyName}`, canonicalUrl: toAbsoluteUrl('/?tab=all') };

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
    const location = seoLocationFromSearch(searchParams);
    const prices = location ? availableInLocation(properties, location).map(p => getNumber(p.price)).filter(p => p > 0) : [];
    if (location) return {
      ...base, title: `${location.title} | ${companyName}`, description: location.kind ? location.intro : prices.length ? `บ้านมือสอง${location.name} ที่เปิดรับจอง ราคาเริ่มต้น ${formatPrice(Math.min(...prices))} บาท เปรียบเทียบขนาดและรายละเอียด พร้อมสอบถามและนัดชมบ้านทางโทรหรือ LINE` : location.intro,
      canonicalUrl: toAbsoluteUrl(locationPath(location)),
      ...(location.kind ? { robots: isLandingIndexable(properties, location) ? 'index,follow' : 'noindex,follow' } : {}),
    };
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

export const buildPageSeo = (options) => {
  const result = buildUnpaginatedSeo(options);
  if (options.selectedProperty || !isListingTab(options.activeTab) || !options.listing) return result;
  const { listing } = options;
  const filtered = Boolean(listing.sort || listing.areas?.length || listing.categories?.length);
  return { ...result,
    canonicalUrl: toAbsoluteUrl(listingHref({ activeTab: options.activeTab, searchParams: options.searchParams, listing })),
    title: `${result.title}${listing.year ? ` · ผลงานปี ${listing.year}` : ''}${listing.page > 1 ? ` · หน้า ${listing.page}` : ''}`,
    ...(filtered ? { robots: 'noindex,follow' } : {}),
  };
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
    availability: property.badge === 'Sold Out' || property.inventoryState === 'sold'
      ? 'https://schema.org/SoldOut'
      : property.inventoryState === 'reserved' ? 'https://schema.org/OutOfStock'
      : ['renovating', 'backup'].includes(property.inventoryState) ? 'https://schema.org/PreOrder'
      : property.inventoryState === 'unknown' ? undefined : 'https://schema.org/InStock',
    seller: { '@id': `${SITE_URL}/#organization` },
  };

  if (price) offer.price = price;

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${getPropertyUrl(property)}#listing`,
    url: getPropertyUrl(property),
    name: getPropertyDisplayName(property),
    description: getPropertyDescription(property),
    image: [getSeoImage(getPropertyImage(property))],
    about: {
      '@type': 'House',
      '@id': `${getPropertyUrl(property)}#property`,
      name: getPropertyDisplayName(property),
      accommodationCategory: cleanText(property.category),
      address: {
        '@type': 'PostalAddress', addressCountry: 'TH',
        streetAddress: cleanText([property.project_name, property.house_number, property.sub_location].filter(Boolean).join(' ')),
        addressLocality: cleanText(property.main_location || property.district),
        ...(property.province ? { addressRegion: cleanText(property.province) } : {}),
      },
      ...(getNumber(property.bedrooms) > 0 ? { numberOfBedrooms: getNumber(property.bedrooms) } : {}),
      ...(getNumber(property.bathrooms) > 0 ? { numberOfBathroomsTotal: getNumber(property.bathrooms) } : {}),
      // Land area is not indoor floor area. Keep the recorded unit explicit.
      ...(getNumber(property.area_wah) > 0 ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'ขนาดที่ดิน', value: getNumber(property.area_wah), unitText: 'ตารางวา' }] } : {}),
    },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าหลัก', item: toAbsoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: primaryPropertyLocation(property) ? `บ้านมือสอง${primaryPropertyLocation(property).name}` : 'บ้านทั้งหมด', item: toAbsoluteUrl(primaryPropertyLocation(property) ? locationPath(primaryPropertyLocation(property)) : '/?tab=all') },
      { '@type': 'ListItem', position: 3, name: getPropertyDisplayName(property), item: getPropertyUrl(property) },
    ] },
    offers: offer,
  };
};

export const buildLocationJsonLd = location => location ? {
  '@context': 'https://schema.org', '@type': 'CollectionPage',
  '@id': toAbsoluteUrl(locationPath(location)), url: toAbsoluteUrl(locationPath(location)),
  name: location.title, description: location.intro,
  breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'หน้าหลัก', item: toAbsoluteUrl('/') },
    { '@type': 'ListItem', position: 2, name: location.kind ? location.name : `บ้านมือสอง${location.name}`, item: toAbsoluteUrl(locationPath(location)) },
  ] },
} : null;

export const buildStructuredData = ({ companyInfo, selectedProperty, location }) => (
  [
    buildLocalBusinessJsonLd(companyInfo || {}),
    buildWebSiteJsonLd(companyInfo || {}),
    buildPropertyJsonLd(selectedProperty, companyInfo || {}),
    !selectedProperty && buildLocationJsonLd(location),
  ].filter(Boolean)
);
