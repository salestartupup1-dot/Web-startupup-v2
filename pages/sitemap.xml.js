import { SEO_LOCATIONS, locationPath, matchesSeoLocation } from '../lib/seoLocations';
import { getSeoStock, includePropertyInSitemap } from '../lib/seoStock';
import { getPublicProperties } from '../lib/publicDataCache';
import { withCanonicalPropertyPaths } from '../lib/propertyCanonicalLinks';
import { withWebsiteInventory, indexableSeoLandings } from '../lib/websiteInventory';
import { ARTICLES_PATH, articleSitemapEntries } from '../lib/articleCatalogue';
import {
  escapeXml,
  formatSitemapDate,
  getPropertyLastModified,
  getPropertyUrl,
  getTimestampDate,
  toAbsoluteUrl,
} from '../lib/seo';

// ?tab= views repeat the home page, so they stay out of the sitemap (SEO work order task 9).
// Home and location pages carry the latest change of any house they cover (new, edited or sold).
const latestChange = houses => houses.map(house => getTimestampDate(getPropertyLastModified(house))).filter(Boolean)
  .sort((a, b) => b - a)[0];
const staticRoutes = allHouses => [
  { loc: toAbsoluteUrl('/'), lastmod: formatSitemapDate(latestChange(allHouses)), changefreq: 'daily', priority: '1.0' },
  ...SEO_LOCATIONS.map(location => ({ loc: toAbsoluteUrl(locationPath(location)),
    lastmod: formatSitemapDate(latestChange(allHouses.filter(house => matchesSeoLocation(house, location)))), changefreq: 'daily', priority: '0.8' })),
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
  let properties = [], stock, allHouses = [];

  try {
    [properties, stock] = await Promise.all([getPublicProperties(), getSeoStock()]);
    allHouses = properties;
    properties = await withCanonicalPropertyPaths(properties.filter(property => includePropertyInSitemap(property, stock)));
  } catch (error) {
    console.error('Unable to verify sitemap inventory:', error?.code || error?.name);
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    res.end('Sitemap temporarily unavailable. Please retry.');
    return { props: {} };
  }

  const propertyRoutes = properties
    .filter(property => includePropertyInSitemap(property, stock))
    .map((property) => ({
      loc: getPropertyUrl(property),
      lastmod: formatSitemapDate(getPropertyLastModified(property)),
      changefreq: 'weekly',
      priority: property.badge === 'Promotion' ? '0.9' : '0.8',
    }));

  // Reuse the same stock snapshot as house URLs: no extra database request.
  const landingRoutes = indexableSeoLandings(properties.map(property => withWebsiteInventory(property, stock)))
    .map(landing => ({ loc: toAbsoluteUrl(locationPath(landing)),
      // Landing criteria need stock status (only bookable homes belong to a landing).
      lastmod: formatSitemapDate(latestChange(allHouses.map(house => withWebsiteInventory(house, stock))
        .filter(house => matchesSeoLocation(house, landing)))), changefreq: 'daily', priority: '0.8' }));
  const articles = articleSitemapEntries();
  const articleRoutes = articles.length ? [
    { loc: toAbsoluteUrl(ARTICLES_PATH), changefreq: 'weekly', priority: '0.6' },
    ...articles.map(article => ({ loc: toAbsoluteUrl(article.path), lastmod: article.lastmod, changefreq: 'monthly', priority: '0.6' })),
  ] : [];
  const routes = [...new Map([...staticRoutes(allHouses), ...landingRoutes, ...propertyRoutes, ...articleRoutes].map(route => [route.loc, route])).values()];
  const xml = buildSitemapXml(routes);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function SitemapXml() {
  return null;
}
