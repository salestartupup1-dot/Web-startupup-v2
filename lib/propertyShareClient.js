import { canonicalPropertyPath } from './propertyRoutes.js';
const links = new Map();
const SITE_ORIGIN = 'https://www.startupup-real-estate.com';

export function getShortShareUrl(property) {
  if (!property?.id) return Promise.reject(new Error('Property is required'));
  const canonical = canonicalPropertyPath(property.canonicalPath);
  if (canonical) return Promise.resolve(SITE_ORIGIN + canonical);
  if (!links.has(property.id)) {
    const request = fetch('/api/property-share', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: property.id }),
    }).then(async response => {
      if (!response.ok) throw new Error('Short link unavailable');
      const { path } = await response.json();
      const canonical = canonicalPropertyPath(path);
      if (!canonical) throw new Error('Invalid property link');
      return SITE_ORIGIN + canonical;
    }).catch(error => { links.delete(property.id); throw error; });
    links.set(property.id, request);
  }
  return links.get(property.id);
}

export async function copyShortShareUrl(property) {
  const url = getShortShareUrl(property);
  // Safari requires clipboard.write during the click, before the network await.
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([new ClipboardItem({
      'text/plain': url.then(text => new Blob([text], { type: 'text/plain' })),
    })]);
  } else {
    await navigator.clipboard.writeText(await url);
  }
  return url;
}
