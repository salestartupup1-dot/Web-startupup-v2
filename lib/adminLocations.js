import { THAI_LOCATIONS } from './data/thaiLocations.js';

const aliases = { กรุงเทพ: 'กรุงเทพมหานคร', 'กรุงเทพฯ': 'กรุงเทพมหานคร', อยุธยา: 'พระนครศรีอยุธยา' };
const canonical = (name) => {
  const value = String(name || '').trim().replace(/^(?:จังหวัด|จ\.|อำเภอ|อ\.|เขต)\s*/, '');
  return aliases[value] || value;
};
const unique = (values) => [...new Set(values.filter(value => typeof value === 'string' && value.trim()))];
const sorted = (values) => unique(values).sort((a, b) => a.localeCompare(b, 'th'));

export function standardSubLocations(area) {
  const name = canonical(area);
  if (Object.hasOwn(THAI_LOCATIONS, name)) return Object.keys(THAI_LOCATIONS[name]);
  // District names can occur in multiple provinces. Do not silently mix them.
  const matches = Object.values(THAI_LOCATIONS).filter(districts => Object.hasOwn(districts, name));
  return matches.length === 1 ? matches[0][name] : [];
}

export function adminLocationOptions(locations, main = '', sub = '') {
  const existing = Array.isArray(locations) ? locations : [];
  const savedAreas = unique([...existing.map(location => location?.area), main]);
  const represented = new Set(savedAreas.map(canonical));
  const mainOptions = [...savedAreas, ...sorted(Object.keys(THAI_LOCATIONS).filter(area => !represented.has(area)))];
  const customSubs = existing
    .filter(location => canonical(location?.area) === canonical(main))
    .flatMap(location => Array.isArray(location.sub_areas) ? location.sub_areas : []);
  return {
    mainOptions,
    subOptions: main ? sorted([...standardSubLocations(main), ...customSubs, sub]) : [],
  };
}
