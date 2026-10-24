// The document ID disambiguates identical house numbers in different projects.
export function propertyPath(property) {
  if (!property?.id) return '/';
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

// Share aliases use the complete document ID: no mutable house-number lookup,
// generated token registry, extra database writes, or collision-prone truncation.
export function propertySharePath(property) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(property?.id || '') ? `/h/${property.id}` : propertyPath(property);
}

export function propertyIdFromSharePath(path) {
  return path?.match(/^\/h\/([A-Za-z0-9_-]{1,128})\/?$/)?.[1] || null;
}
