// Coordinates and website highlights come from the website's shared, revision-verified catalogue.
// Build snapshots remain the default for ordinary map requests.
import { inThailand } from './mapurl.mjs';

const MAP_SOURCE = 'https://www.startupup-real-estate.com/api/map-data';

const parseCoord = (value) => {
  const n = parseFloat(String(value ?? '').replace(/,/g, '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

const normalizeKey = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .trim()
  .toLowerCase()
  .replace(/\*+/g, '')
  .replace(/\s+/g, '')
  .replace(/[-–—]/g, '/');

export async function fetchFirestoreCoords() {
  const response = await fetch(MAP_SOURCE, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Website map source failed (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.properties)) throw new Error('Invalid website map source');
  const documents = payload.properties;

  const byHouse = {};
  const byProject = {};
  const properties = [];

  documents.forEach((document) => {
    const data = { ...document, project_name: document.project, house_number: document.houseNumber };
    properties.push(document);
    const lat = parseCoord(data.lat);
    const lng = parseCoord(data.lng);
    if (!inThailand(lat, lng)) return;

    const houseKey = normalizeKey(data.house_number);
    const projectKey = normalizeKey(data.project_name);
    if (houseKey && !(houseKey in byHouse)) byHouse[houseKey] = [lat, lng];
    if (projectKey) {
      if (!byProject[projectKey]) byProject[projectKey] = [];
      byProject[projectKey].push([lat, lng]);
    }
  });

  return { byHouse, byProject, properties, docCount: documents.length };
}
