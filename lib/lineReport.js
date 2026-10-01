import { sourceGroup } from './lineAttribution.js';

export const PLATFORM_LABELS = Object.freeze({
  website: 'Website/Google Ads', facebook: 'Facebook', tiktok: 'TikTok',
  other: 'ช่องทางอื่น', unknown: 'ไม่ทราบที่มา/ไอดีไลน์',
});
export function reportPlatform(touch) {
  const source = sourceGroup(touch);
  if (source === 'google_organic') return 'website';
  if (source === 'facebook_ads') return 'facebook';
  if (source === 'tiktok_ads' || source === 'tiktok_migration') return 'tiktok';
  return Object.hasOwn(PLATFORM_LABELS, source) ? source : 'unknown';
}
export function bangkokDate(now = Date.now()) {
  return new Date(now + 7 * 3600000).toISOString().slice(0, 10);
}
export function defaultReportRange(now = Date.now()) {
  const end = bangkokDate(now);
  return { start: end.slice(0, 8) + '01', end };
}
function midnight(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const at = Date.parse(value + 'T00:00:00+07:00');
  return Number.isFinite(at) && bangkokDate(at) === value ? at : NaN;
}
export function formatReportDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
export function parseReportDate(value) {
  const match = typeof value === 'string' && /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  if (!Number.isFinite(midnight(iso))) {
    throw new Error('กรุณาระบุวันที่เป็น dd/mm/yyyy (ปี ค.ศ.) เช่น 23/09/2026 และตรวจสอบว่าวันที่มีอยู่จริง');
  }
  return iso;
}
export function reportRange(input = {}, now = Date.now()) {
  const defaults = defaultReportRange(now);
  const start = input.start === undefined ? defaults.start : input.start;
  const end = input.end === undefined ? defaults.end : input.end;
  const from = midnight(start), until = midnight(end) + 86400000;
  const platform = input.platform === undefined ? 'all' : input.platform;
  if (!Number.isFinite(from) || !Number.isFinite(until) || from < 0 || from >= until || until > 1e13
    || (platform !== 'all' && !Object.hasOwn(PLATFORM_LABELS, platform))) {
    throw Object.assign(new Error('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดให้ถูกต้อง และเลือกช่องทางที่มีอยู่'), { status: 400 });
  }
  return { start, end, from, until, platform };
}
// A single indexed field supports channel + date ranges without a composite index.
export const platformDateKey = (platform, at) => `${platform}:${String(at).padStart(13, '0')}`;
