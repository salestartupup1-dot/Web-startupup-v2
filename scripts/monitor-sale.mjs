import { mkdir, writeFile, appendFile } from 'node:fs/promises';

const base = process.env.SALE_MONITOR_BASE_URL || 'https://www.startupup-real-estate.com';
const slugs = (process.env.SALE_MONITOR_PROPERTIES || '24-182,5-557,5-833').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
const records = [];
let failed = false;
for (const slug of slugs) {
  let ok = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    const record = { time: new Date().toISOString(), property: slug, attempt };
    try {
      const response = await fetch(new URL('/api/property?property=' + encodeURIComponent(slug), base),
        { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      const checkedAt = Date.parse(data.checkedAt);
      Object.assign(record, { status: response.status, requestId: response.headers.get('x-request-id'),
        durationMs: Date.now() - started });
      ok = response.ok && Boolean(data.property?.id)
        && response.headers.get('cache-control')?.includes('no-store')
        && Number.isFinite(checkedAt) && Math.abs(Date.now() - checkedAt) < 60000;
      record.ok = ok;
      if (!ok) record.reason = response.ok ? 'Invalid or stale response' : 'Property API unavailable';
      records.push(record);
      if (ok || data.retryable === false || response.status === 404) break;
    } catch (error) {
      records.push({ ...record, ok: false, durationMs: Date.now() - started, reason: error.name });
    }
    if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!ok) failed = true;
}
// Evidence only: do not store response bodies, prices, customer information or secrets.
await mkdir('coverage', { recursive: true });
await writeFile('coverage/sale-health.json', JSON.stringify(records, null, 2));
console.log(JSON.stringify(records, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY,
    '# Sale Page API monitor\n\n' + (failed ? 'FAILED: inspect sale-health.json and match requestId in Vercel logs.' : 'All sample property APIs returned fresh data.') + '\n');
}
if (failed) process.exitCode = 1;
