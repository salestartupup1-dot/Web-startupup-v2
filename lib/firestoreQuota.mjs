export const READ_THRESHOLDS = [30000, 40000, 45000];
const zone = 'America/Los_Angeles';
export function quotaDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function quotaDayStart(now = new Date()) {
  const day = quotaDay(now);
  // LA midnight is UTC 07:00 or 08:00. Resolve using the offset at midnight,
  // including the days daylight saving time changes later that morning.
  const candidate = new Date(`${day}T08:00:00Z`);
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' }).format(candidate));
  return new Date(candidate.getTime() - hour * 3600000);
}
export function restrictOptionalReads(budget, now = new Date()) {
  return budget?.day === quotaDay(now) && Number(budget.reads) >= 45000;
}
export async function readDailyUsage({ token, projectId, now = new Date(), fetcher = fetch }) {
  const start = quotaDayStart(now);
  let pageToken, reads = 0, latest = null, points = 0;
  do {
    const query = new URLSearchParams({
      filter: 'metric.type="firestore.googleapis.com/document/read_ops_count" AND resource.type="firestore.googleapis.com/Database" AND resource.labels.database_id="(default)"',
      'interval.startTime': start.toISOString(), 'interval.endTime': now.toISOString(),
      view: 'FULL', pageSize: '100000', ...(pageToken ? { pageToken } : {}),
    });
    const response = await fetcher(`https://monitoring.googleapis.com/v3/projects/${encodeURIComponent(projectId)}/timeSeries?${query}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Cloud Monitoring HTTP ${response.status}; verify monitoring.timeSeries.list permission and API availability`);
    const data = await response.json();
    for (const series of data.timeSeries || []) for (const point of series.points || []) {
      const value = Number(point.value?.int64Value);
      const end = Date.parse(point.interval?.endTime);
      if (!Number.isFinite(value) || value < 0 || !Number.isFinite(end)) throw new Error('Invalid Monitoring point');
      reads += value; points++;
      latest = Math.max(latest || 0, end);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  // Missing or delayed metrics never mean zero consumption.
  if (!points) throw new Error('No usage metrics available for this quota day yet');
  return { day: quotaDay(now), reads, observedThrough: new Date(latest).toISOString(), checkedAt: now.toISOString(),
    stale: now.getTime() - latest > 15 * 60000, threshold: READ_THRESHOLDS.filter(t => reads >= t).at(-1) || 0 };
}
