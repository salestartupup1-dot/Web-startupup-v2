import { alertTransition, sendSaleAlert } from '../lib/saleMonitorAlert.mjs';

const failed = process.env.SALE_MONITOR_FAILED === 'true';
const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '') || !/^\d+$/.test(runId || '')) throw new Error('Missing GitHub run context');
const token = process.env.LINE_ALERT_CHANNEL_ACCESS_TOKEN;
const userId = process.env.LINE_ALERT_USER_ID;
if (!token || !userId) {
  console.log('::warning::LINE alerts are not active: configure LINE_ALERT_CHANNEL_ACCESS_TOKEN and LINE_ALERT_USER_ID in repository Actions secrets.');
} else {
  async function github(path) {
    const response = await fetch('https://api.github.com/repos/' + repo + path, {
      headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Unable to read previous monitor state: HTTP ' + response.status);
    return response.json();
  }
  const history = await github('/actions/workflows/sale-health.yml/runs?status=completed&branch=main&per_page=10');
  const prior = history.workflow_runs.find(run => BigInt(run.id) < BigInt(runId));
  let previous = null;
  if (prior) {
    const jobs = await github('/actions/runs/' + prior.id + '/jobs');
    const steps = jobs.jobs.find(job => job.name === 'monitor')?.steps || [];
    const check = steps.find(step => step.name === 'Check fresh property reads');
    const alert = steps.find(step => step.name === 'Notify Peth on LINE');
    if (check && ['success', 'failure'].includes(check.conclusion)) {
      previous = { failed: check.conclusion === 'failure', alertSucceeded: alert?.conclusion === 'success' };
    }
  }
  const state = alertTransition(failed, previous);
  if (state) {
    await sendSaleAlert({ state, token, userId, runId, runUrl: `https://github.com/${repo}/actions/runs/${runId}` });
    console.log('LINE notification accepted: ' + state);
  } else console.log('No status transition; no duplicate LINE notification.');
  if (process.env.SALE_MONITOR_TEST_LINE === 'true' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    await sendSaleAlert({ state: 'test', token, userId, runId, runUrl: `https://github.com/${repo}/actions/runs/${runId}` });
    console.log('LINE recipient verified; test notification accepted.');
  }
}
