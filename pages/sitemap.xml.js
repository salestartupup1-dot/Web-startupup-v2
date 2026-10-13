import { getPublicProperties } from '../lib/publicDataCache';
import {
  escapeXml,
  formatSitemapDate,
  getPropertyLastModified,
  getPropertyUrl,
  isIndexableProperty,
  toAbsoluteUrl,
} from '../lib/seo';

const STATIC_ROUTES = [
  { loc: toAbsoluteUrl('/'), changefreq: 'daily', priority: '1.0' },
  { loc: toAbsoluteUrl('/?tab=promo'), changefreq: 'daily', priority: '0.8' },
  { loc: toAbsoluteUrl('/?tab=location'), changefreq: 'weekly', priority: '0.7' },
  { loc: toAbsoluteUrl('/?tab=calculator'), changefreq: 'monthly', priority: '0.4' },
  { loc: toAbsoluteUrl('/?tab=portfolio'), changefreq: 'weekly', priority: '0.5' },
];

const buildUrlNode = ({ loc, lastmod, changefreq, priority }) => [
  '  <url>',
  `    <loc>${escapeXml(loc)}</loc>`,
  lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : '',
  changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : '',
  priority ? `    <priority>${escapeXml(priority)}</priority>` : '',
  '  </url>',
].filter(Boolean).join('\n');

const buildSitemapXml = (urls) => [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urls.map(buildUrlNode).join('\n'),
  '</urlset>',
].join('\n');

export async function getServerSideProps({ res }) {
  let properties = [];

  try {
    properties = await getPublicProperties();
  } catch (error) {
    console.error('Unable to load properties for sitemap.xml', error);
  }

  const propertyRoutes = properties
    .filter(isIndexableProperty)
    .map((property) => ({
      loc: getPropertyUrl(property),
      lastmod: formatSitemapDate(getPropertyLastModified(property)),
      changefreq: 'weekly',
      priority: property.badge === 'Promotion' ? '0.9' : '0.8',
    }));

  const xml = buildSitemapXml([...STATIC_ROUTES, ...propertyRoutes]);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapXml() {
  return null;
}
