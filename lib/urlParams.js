// Parameters the site rewrites from its own state. Everything else in the address bar
// belongs to someone else (ad click IDs, campaign tags, ?near=) and must survive rewrites:
// Google tag reads gclid from the URL after the first rewrite has already happened.
export const SITE_OWNED_PARAMS = new Set(['tab', 'sType', 'sValue', 'sArea', 'property', 'page', 'sort', 'area', 'category', 'year', 'admin']);

export function keepForeignParams(params, currentSearch = '') {
  new URLSearchParams(currentSearch).forEach((value, key) => {
    if (!SITE_OWNED_PARAMS.has(key) && !params.has(key)) params.append(key, value);
  });
  return params;
}
