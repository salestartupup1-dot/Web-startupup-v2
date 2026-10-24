import { selectPublicProperties } from './propertyOwners.js';

export const PORTFOLIO_PATH = '/?tab=portfolio';
export const SOLD_HOMES_SLUG = 'บ้านที่ขายแล้ว';
export const SOLD_HOMES_PATH = `/${encodeURIComponent(SOLD_HOMES_SLUG)}`;
export function isSoldHomesPath(path = '') {
  try { return decodeURIComponent(path.split('?')[0]).replace(/\/$/, '') === `/${SOLD_HOMES_SLUG}`; }
  catch { return false; }
}

// The count is public, confirmed sold stock on this website, not a lifetime
// transaction claim. Partner, reserved and unverified houses are not included.
export function selectSoldHomes(properties = []) {
  return [...new Map(selectPublicProperties(properties)
    .filter(property => property.id && (property.inventoryState === 'sold' || property.badge === 'Sold Out'))
    .map(property => [property.id, property])).values()];
}
