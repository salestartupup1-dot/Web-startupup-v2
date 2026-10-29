export function propertySlugLabel(property) {
  return [property?.project_name, property?.house_number].filter(Boolean).join('-')
    .normalize('NFC').trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 220).replace(/-$/, '');
}

export function isPropertySlug(slug) {
  return typeof slug === 'string' && slug.length <= 250 && /^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)+$/u.test(slug);
}

export function canonicalPropertyPath(path) {
  try {
    if (typeof path !== 'string' || !path.startsWith('/')) return null;
    const slug = decodeURIComponent(path.slice(1));
    return isPropertySlug(slug) || /^[a-f0-9]{6}$/.test(slug) ? `/${encodeURIComponent(slug)}` : null;
  } catch { return null; }
}

// Old full-ID routes remain a safe fallback until a readable name is reserved.
export function propertyPath(property) {
  if (!property?.id) return '/';
  const canonical = canonicalPropertyPath(property.canonicalPath);
  if (canonical) return canonical;
  const label = [property.project_name, property.house_number].filter(Boolean).join('-')
    .normalize('NFC').trim().replace(/[^\p{L}\p{M}\p{N}-]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `/homes/${encodeURIComponent(label || 'บ้าน')}--${encodeURIComponent(property.id)}`;
}

export function propertyIdFromPath(path) {
  try {
    const decoded = decodeURIComponent(path);
    const match = decoded.match(/^\/homes\/[^/]+--([A-Za-z0-9_-]+)\/?$/u);
    return match?.[1] || null;
  } catch { return null; }
}

// Shared links stay ASCII: a copied Thai letter becomes 9 characters (%E0%B8..).
export const isSharePath = path => typeof path === 'string' && path.length <= 64 && /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path);

// The house number alone (16/10413 -> 16-10413); anything non-ASCII or without a separator
// (99, 12 ม.3) is left to the random short code so it cannot clash with site pages.
export function propertyShareLabel(property) {
  const raw = String(property?.house_number || '').trim();
  if (!/^[A-Za-z0-9\s/.-]+$/.test(raw)) return null;
  const label = raw.toLowerCase().replace(/[\s/.-]+/g, '-').replace(/^-|-$/g, '');
  return label.length <= 40 && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(label) ? label : null;
}

// Prefer the server-reserved house-number alias; the full document ID route is the fallback.
export function propertySharePath(property) {
  if (isSharePath(property?.sharePath)) return property.sharePath;
  return /^[A-Za-z0-9_-]{1,128}$/.test(property?.id || '') ? `/h/${property.id}` : propertyPath(property);
}

export function propertyIdFromSharePath(path) {
  return path?.match(/^\/h\/([A-Za-z0-9_-]{1,128})\/?$/)?.[1] || null;
}
