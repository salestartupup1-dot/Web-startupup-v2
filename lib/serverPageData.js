import { getWebsiteData } from './websiteData.js';
import { enrichWebsiteProperty } from './seoStock.js';
import { relatedAvailableProperties } from './websiteInventory.js';
import { createPropertyReader } from './propertyReadService.js';
import { propertyPath, propertyIdFromPath, propertyIdFromSharePath, isPropertySlug } from './propertyRoutes.js';
import { seoCatalogue } from './seoCatalogue.js';
import { seoLocationFromPath, seoLocationFromSearch, locationPath } from './seoLocations.js';
import { isShortCode, propertyShortLinks } from './propertyShortLinks.js';
import { withCanonicalPropertyPath, propertyCanonicalLinks } from './propertyCanonicalLinks.js';

export const readSeoProperty = createPropertyReader();
const serializable = value => JSON.parse(JSON.stringify(value));

export function privateResponse(res) {
  // Prices are checked on every request; do not serve yesterday's HTML at the CDN.
  for (const header of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) res.setHeader(header, 'no-store');
}

export function unavailablePage(res, error) {
  console.error('SEO page data unavailable:', error?.code || error?.name || 'unknown');
  privateResponse(res);
  res.statusCode = 503;
  res.setHeader('Retry-After', '60');
  return { props: { unavailable: true } };
}

export async function loadSitePage({ query, resolvedUrl, res }, { readProperty = readSeoProperty, readCatalogue = getWebsiteData, enrichProperty = enrichWebsiteProperty,
  canonicalize = withCanonicalPropertyPath, resolveShort = code => propertyShortLinks.resolve(code),
  resolveSlug = slug => propertyCanonicalLinks.resolve(slug) } = {}) {
  privateResponse(res);
  const path = resolvedUrl.split('?')[0];
  let id = propertyIdFromPath(path) || propertyIdFromSharePath(path);
  const legacy = typeof query.property === 'string' ? query.property : null;
  try {
    const code = path.replace(/^\//, '').replace(/\/$/, '');
    if (isShortCode(code)) {
      id = await resolveShort(code);
      if (!id) return { notFound: true };
    } else if (!id && !seoLocationFromPath(path) && isPropertySlug(decodeURIComponent(code))) {
      id = await resolveSlug(decodeURIComponent(code));
      if (!id) return { notFound: true };
    }
    if (id || legacy) {
      const freshProperty = await readProperty(id || legacy, id ? { documentId: id } : {}).promise;
      if (!freshProperty) return { notFound: true };
      const property = await canonicalize(freshProperty);
      const canonical = propertyPath(property);
      if (legacy || decodeURIComponent(path) !== decodeURIComponent(canonical)) {
        const params = new URLSearchParams(resolvedUrl.split('?')[1] || '');
        params.delete('property'); params.delete('tab');
        const suffix = params.toString();
        return { redirect: { destination: canonical + (suffix ? `?${suffix}` : ''), permanent: true } };
      }
      const [settings, selectedProperty] = await Promise.all([readCatalogue().catch(() => readCatalogue({ includeProperties: false })), enrichProperty(property)]);
      const properties = seoCatalogue(relatedAvailableProperties(selectedProperty, settings.properties));
      return { props: { initialData: serializable({ ...settings, properties, selectedProperty, activeTab: 'home' }) } };
    }
    const location = seoLocationFromPath(path);
    const legacyLocation = query.tab === 'search_result' && seoLocationFromSearch({ type: query.sType, value: query.sValue });
    if (legacyLocation && !location) {
      const params = new URLSearchParams(resolvedUrl.split('?')[1] || '');
      for (const key of ['tab', 'sType', 'sValue', 'sArea']) params.delete(key);
      const suffix = params.toString();
      return { redirect: { destination: locationPath(legacyLocation) + (suffix ? `?${suffix}` : ''), permanent: true } };
    }
    const data = await readCatalogue();
    if (location) return { props: { initialData: serializable({ ...data, properties: seoCatalogue(data.properties), activeTab: 'search_result',
      searchParams: { type: 'location_group', value: location.name, area: '' } }) } };
    const activeTab = ['home', 'all', 'location', 'promo', 'calculator', 'portfolio', 'search_result'].includes(query.tab) ? query.tab : 'home';
    return { props: { initialData: serializable({ ...data, properties: activeTab === 'portfolio' ? data.properties : seoCatalogue(data.properties), activeTab,
      searchParams: { type: String(query.sType || 'all'), value: String(query.sValue || ''), area: String(query.sArea || '') } }) } };
  } catch (error) { return unavailablePage(res, error); }
}

// Render the site's 404 inside SSR responses too. Vercel's dynamic notFound
// fallback can otherwise use Next's generic error document instead of /404.
export function missingPage(res) {
  privateResponse(res);
  res.statusCode = 404;
  return { props: { missing: true } };
}
export async function resolveSitePage(context, dependencies) {
  const result = await loadSitePage(context, dependencies);
  return result.notFound ? missingPage(context.res) : result;
}
