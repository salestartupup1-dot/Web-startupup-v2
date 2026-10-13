// Preserve sub-second changes, including edits made by older admin clients.
export function publicDataVersion(data) {
  if (!data) return null;
  const stamp = data.updatedAt;
  const revision = data.version ? `${data.version}:` : '';
  if (stamp && typeof stamp === 'object' && stamp.seconds != null) {
    return `${revision}${stamp.seconds}:${stamp.nanoseconds || 0}`;
  }
  return stamp ? `${revision}${stamp}` : (data.version || null);
}

export const PUBLIC_SECTIONS = ['properties', 'company', 'visual', 'popup', 'promotion'];
export const sectionForPath = path => path.startsWith('properties/') ? 'properties'
  : ({ 'company_info/main': 'company', 'site_settings/visual': 'visual',
    'site_settings/popup': 'popup', 'site_settings/sale_promotion': 'promotion' })[path];

// Older open admin tabs only write updatedAt. Never trust scoped revisions
// after such a write; the next modern transaction repairs all section markers.
export function hasScopedVersions(data) {
  return Boolean(data?.scopedAt && publicDataVersion(data)
    === publicDataVersion({ ...data, updatedAt: data.scopedAt }));
}
export function publicSectionVersion(data, section) {
  return hasScopedVersions(data) && data.sections?.[section]
    ? publicDataVersion({ updatedAt: data.sections[section] }) : publicDataVersion(data);
}
