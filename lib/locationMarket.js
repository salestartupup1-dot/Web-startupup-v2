import { availableInLocation } from './websiteInventory.js';

// Use the catalogue already loaded for this page; no additional database reads.
export function locationMarket(location, properties = []) {
  const houses = [...new Map(availableInLocation(properties, location).map((house, index) => [house.id || `row-${index}`, house])).values()];
  const prices = houses.map(house => Number(String(house.price ?? '').replace(/,/g, ''))).filter(value => Number.isFinite(value) && value > 0);
  return { count: houses.length, pricedCount: prices.length,
    min: prices.length ? Math.min(...prices) : null, max: prices.length ? Math.max(...prices) : null };
}
