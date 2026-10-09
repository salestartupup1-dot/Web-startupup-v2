# Sale Page availability

Flow: share link -> fresh /api/property -> public Firestore REST -> Sale Page.
No cached catalogue price or sold-state fallback is allowed.

## Recovery
- Three attempts, exponential delay plus jitter, Retry-After respected (bounded at 5 seconds).
- One loading cycle has a 30-second browser deadline; each server lookup has an 8-second deadline.
- Manual retry stays on the same page. Up to two additional recovery cycles after a transient failure,
  spaced at 15/30 seconds or triggered by online/visibility events. No endless background polling.
- Known quota/permission/configuration errors do not automatically retry.
- Concurrent requests for exactly the same slug share only an in-progress read.
- A bounded 60-second slug -> document ID hint avoids repeated queries, but always reads the
  document fresh and validates the slug. Expired/renamed/deleted hints trigger a new lookup.
- These are per-function-instance optimizations, not an independent database failover.

## Evidence
Every valid property request logs a JSON public_property_read event: UTC time, requestId,
property slug (truncated), status, durationMs, shared flag, upstreamStatus and cause code.
The response includes X-Request-Id. No upstream response body or personal data is logged.
Vercel runtime log retention is determined by the hosting plan; this change does not extend it.

The Sale Page availability GitHub workflow schedules a sample of three APIs every ten minutes,
away from the top of the hour. The scheduler can be delayed; this is not a guaranteed uptime SLA.
It stores only status/timing/request IDs in sale-health.json for up to 90 days (subject to repo
retention). Artifacts are public because this repository is public; no property data is stored.
It tests fresh API availability, not browser rendering or every house.
It does not call the full catalogue. Update the sample slugs when permanently removing these houses.
GitHub can disable scheduled workflows after 60 days of repository inactivity.

Failed probes fail the workflow. Delivery of GitHub Actions web/email notifications depends on
the account's Actions notification settings.
Use Actions -> Sale Page availability -> Run workflow for an immediate check.

## During an incident
1. Record Thai time, URL and whether another network is affected. Convert Thai time to UTC (-7h).
2. Inspect monitor artifact and /api/property request ID; search Vercel logs for that requestId.
3. TIMEOUT / UNAVAILABLE: check Firestore and Vercel latency/service health.
4. QUOTA_EXCEEDED: inspect Firebase Usage and Google Cloud quotas; fix excessive reads first.
   Billing changes require the owner's decision; repeated retries do not fix a daily quota.
5. PERMISSION_DENIED / FAILED_PRECONDITION: inspect rules/configuration/indexes before retrying.
6. After recovery test a fresh property API and browser reload, and a real admin price update.

## LINE alerts for Peth
Repository owner: Settings -> Secrets and variables -> Actions -> New repository secret:
- LINE_ALERT_CHANNEL_ACCESS_TOKEN: Messaging API channel access token for the existing OA.
- LINE_ALERT_USER_ID: Peth's U-prefixed 32-hex-digit LINE user ID, under the same provider as that OA.
  Obtain from a verified webhook/private lead record or the developer's own Basic settings page.
  A display name, LINE handle, Login channel ID, channel secret, or bot ID is not this user ID.
Peth must have added the OA and not blocked it. Never place credentials in chat or in this repository.
The GitHub runner calls LINE directly, so notification does not depend on the site/Firestore being up.
Send only on an outage transition and recovery. A continuing outage with a successful alert is suppressed;
a failed delivery is retried in the next monitor run, with a stable LINE retry key within each run.
Missing secrets visibly skip LINE delivery and emit a workflow warning. API monitoring still runs.
Run the workflow after setup; the current implementation has been tested with mocked delivery only.

A separate durable export of every application error log and independent content backup require
choosing/configuring those services. Monitor history alone cannot reconstruct every customer's incident.
