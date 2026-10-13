import { highlightId, highlightKey, hasHighlights, matchWebsiteHouse } from './highlights.mjs';

const ROOT = 'projects/startup-up-realestate/databases/(default)/documents';
const API = `https://firestore.googleapis.com/v1/${ROOT}`;
const SOURCE = 'https://www.startupup-real-estate.com/api/map-data';

export async function fetchHighlightProperties(fetcher = fetch) {
  const response = await fetcher(SOURCE, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Website highlights unavailable');
  const payload = await response.json();
  if (!Array.isArray(payload.properties)) throw new Error('Invalid website highlights');
  return payload.properties;
}

export async function buildHighlightStatuses(houses, properties, fetcher = fetch) {
  const unique = [...new Map(houses.map(h => [highlightKey(h), h])).values()];
  const identities = await Promise.all(unique.map(async house => ({ house, id: await highlightId(house) })));
  const statuses = {};
  // Existing rules permit individual gets, not collection listing. Batch only
  // the known active Stock identities; no admin credentials or rule changes.
  for (let start = 0; start < identities.length; start += 100) {
    const batch = identities.slice(start, start + 100);
    const documents = batch.filter(x => x.id).map(x => `${ROOT}/stock_map_highlights/${x.id}`);
    let results = [];
    if (documents.length) {
      const response = await fetcher(`${API}:batchGet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ documents, mask: { fieldPaths: ['mode', 'text'] } }),
      });
      if (!response.ok) throw new Error('Saved highlights unavailable');
      results = await response.json();
    }
    const overrides = new Map(results.map(result => {
      if (result.found) {
        const f = result.found.fields || {};
        return [result.found.name, { mode: f.mode?.stringValue, text: f.text?.stringValue || '' }];
      }
      return [result.missing, null];
    }));
    for (const { house, id } of batch) {
      const path = `${ROOT}/stock_map_highlights/${id}`;
      if (id && !overrides.has(path)) throw new Error('Incomplete saved highlights response');
      statuses[highlightKey(house)] = hasHighlights(overrides.get(path), matchWebsiteHouse(house, properties)?.highlights);
    }
  }
  return statuses;
}

export function summarizeHighlightStatuses(houses, statuses) {
  const missing = [], unknown = [];
  for (const house of houses) {
    const status = statuses[highlightKey(house)];
    if (status === false) missing.push(house);
    else if (status !== true) unknown.push(house);
  }
  return { missing, unknown, complete: houses.length - missing.length - unknown.length };
}
