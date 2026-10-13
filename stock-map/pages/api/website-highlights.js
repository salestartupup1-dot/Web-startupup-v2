import snapshot from '../../data/website-coords.json';
import { matchWebsiteHouse, websiteHouseNumberVariants } from '../../lib/highlights.mjs';

const BASE = 'https://firestore.googleapis.com/v1/projects/startup-up-realestate/databases/(default)/documents/artifacts/startup-up-realestate/public/data';
const fromDocument = document => {
  const f = document.fields || {};
  const id = document.name.split('/').pop();
  return { id, project: f.project_name?.stringValue || '', houseNumber: f.house_number?.stringValue || '', highlights: f.highlights?.stringValue || '', slug: f.custom_id?.stringValue || id };
};
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').end();
  const { project, number } = req.query;
  if (typeof project !== 'string' || typeof number !== 'string' || project.length > 300 || number.length > 300) return res.status(400).json({ error: 'ข้อมูลบ้านไม่ถูกต้อง' });
  const house = { project, houseNumber: number };
  const fallback = matchWebsiteHouse(house, snapshot.properties || []);
  let property = null, stale = false;
  try {
    if (fallback) {
      const response = await fetch(`${BASE}/properties/${encodeURIComponent(fallback.id)}`, { signal: AbortSignal.timeout(8000) });
      if (response.ok) property = matchWebsiteHouse(house, [fromDocument(await response.json())]);
      else if (response.status !== 404) throw new Error('Source unavailable');
    }
    // New listings also support slash/dash address formats without a redeploy.
    // Require an unambiguous project + complete unit match in the result.
    if (!property && number.trim() && project.trim()) {
      const response = await fetch(`${BASE}:runQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'properties' }], where: { fieldFilter: { field: { fieldPath: 'house_number' }, op: 'IN', value: { arrayValue: { values: websiteHouseNumberVariants(number).map(stringValue => ({ stringValue })) } } } }, limit: 50 } }),
      });
      if (!response.ok) throw new Error('Source unavailable');
      const documents = (await response.json()).filter(row => row.document).map(row => fromDocument(row.document));
      property = documents.length < 50 ? matchWebsiteHouse(house, documents) : null;
    }
  } catch {
    if (!fallback) return res.status(503).json({ error: 'โหลดจุดเด่นจากเว็บหลักไม่ได้' });
    property = fallback; stale = true;
  }
  res.setHeader('Cache-Control', stale ? 'public, s-maxage=60' : 'public, s-maxage=300, stale-while-revalidate=300');
  return res.status(200).json({ highlights: property?.highlights || '', url: property ? `https://startupup-real-estate.com/api/share?property=${encodeURIComponent(property.slug)}` : '', stale });
}
