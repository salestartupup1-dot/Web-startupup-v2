import { getPublicData } from './publicDataCache.js';
import { createPropertyReader } from './propertyReadService.js';
import { propertyPath, propertyIdFromPath } from './propertyRoutes.js';
import { seoCatalogue } from './seoCatalogue.js';

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

export async function loadSitePage({ query, resolvedUrl, res }, { readProperty = readSeoProperty, readCatalogue = getPublicData } = {}) {
  privateResponse(res);
  const path = resolvedUrl.split('?')[0];
  const id = propertyIdFromPath(path);
  const legacy = typeof query.property === 'string' ? query.property : null;
  try {
    if (id || legacy) {
      const property = await readProperty(id || legacy, id ? { documentId: id } : {}).promise;
      if (!property) return { notFound: true };
      const canonical = propertyPath(property);
      if (legacy || decodeURIComponent(path) !== decodeURIComponent(canonical)) {
        const params = new URLSearchParams(resolvedUrl.split('?')[1] || '');
        params.delete('property'); params.delete('tab');
        const suffix = params.toString();
        return { redirect: { destination: canonical + (suffix ? `?${suffix}` : ''), permanent: true } };
      }
      const settings = await readCatalogue({ includeProperties: false });
      return { props: { initialData: serializable({ ...settings, selectedProperty: property, activeTab: 'home' }) } };
    }
    const data = await readCatalogue();
    const activeTab = ['home', 'all', 'location', 'promo', 'calculator', 'portfolio', 'search_result'].includes(query.tab) ? query.tab : 'home';
    return { props: { initialData: serializable({ ...data, properties: activeTab === 'portfolio' ? data.properties : seoCatalogue(data.properties), activeTab,
      searchParams: { type: String(query.sType || 'all'), value: String(query.sValue || ''), area: String(query.sArea || '') } }) } };
  } catch (error) { return unavailablePage(res, error); }
}
