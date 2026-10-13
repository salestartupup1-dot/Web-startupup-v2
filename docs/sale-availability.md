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
After setup, run the workflow with test_line checked. It verifies the recipient's profile and sends
an explicitly labeled test message without simulating an outage. LINE acceptance is not a read receipt.

A separate durable export of every application error log and independent content backup require
choosing/configuring those services. Monitor history alone cannot reconstruct every customer's incident.

## Free-tier read reduction (October 2026)

- Public lists, sitemap and `/api/map-data` share a versioned catalogue. Production cache misses
  use a private compressed snapshot plus a 30-second Firestore lease so concurrent server
  instances do not all scan `properties`. Prices are never served when revision checks fail.
  Production needs the existing `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
  and `FIREBASE_ADMIN_PRIVATE_KEY` for `startup-up-realestate`, with access to the private
  snapshot collection. Verify a cold catalogue request before promoting the deployment.
- Public saves atomically update scoped revision markers. Popup/company/visual/promotion
  saves do not invalidate the houses. An old admin tab writing only the global marker still
  invalidates all sections; the next modern save repairs the scoped markers.
- A direct Sale Page loads only settings and the requested fresh house. Its recommendation
  list loads when the visitor approaches it. Full admin listeners require an open admin panel.
- Lead Source caches aggregate counts by data revision and date range; page and channel
  filters reuse them. New visits and legacy migration invalidate the summary; ordinary
  messages on an existing lead update its profile without rescanning historical counts.
- Stock Map must be deployed **after** the website exposes `/api/map-data`. It reuses that
  projection; its override-status summary uses a shared cache with the existing one-hour TTL.

### Optional daily quota monitor — setup required

The `firestore-quota.yml` workflow uses GitHub OIDC / Google Workload Identity Federation,
with a five-minute access token and no downloaded service-account key. Google trusts only
repository ID `1218815511`, owner ID `280205260`, branch `main`, and this exact workflow path.
The `website-quota-monitor` service account has a custom role containing only
`monitoring.timeSeries.list`, `datastore.entities.create`, and `datastore.entities.update`.
Firestore IAM write permissions apply across the project; this role has no document read,
list, delete or IAM-administration permissions. The script writes only the quota budget document.

Actions variables: `FIRESTORE_MONITOR_WIF_PROVIDER`, `FIRESTORE_MONITOR_SERVICE_ACCOUNT`,
and `FIRESTORE_QUOTA_MONITOR_ENABLED=true`. LINE uses the existing
`LINE_ALERT_CHANNEL_ACCESS_TOKEN` and `LINE_ALERT_USER_ID` secrets for Peth.
Use workflow_dispatch with `test_line=true` for a clearly labeled end-to-end test.
Missing metrics or credentials fail visibly, never as zero usage. Credentials are not artifacts.

The monitor sums `firestore.googleapis.com/document/read_ops_count` from Pacific midnight,
including daylight-saving changes, and alerts at 30k/40k/45k. A stable LINE retry key deduplicates
each daily threshold for LINE's 24-hour retention period. Metrics are sampled every minute and
can arrive several minutes late; GitHub schedules can also be delayed. It is **not a hard cap**
and cannot guarantee all applications sharing the Firebase project stay under 50k reads.

When the last recorded count for the current Pacific day is >=45k, new expensive Lead Source
summary scans pause; existing cached summaries remain usable. The restriction expires on the
next Pacific day. Public price checks remain live. If saving the budget fails, the workflow
reports that the guard was not updated. Activation and the most recent run must be checked in GitHub Actions; code presence alone is not proof of delivery.

### Local data without production reads

Install Java 21+ and Node, then in two terminals:

    npm run emulators
    npm run dev:offline -- -p 3017

The second command requires the local emulator, seeds synthetic public houses/settings into
`demo-startupup-website`, then starts Next development mode. It exits if the emulator is absent;
it does not fall back to production. Production builds ignore the emulator flag. The permissive
`tests/fixtures/firestore.local.rules` is **only** for the local demo project; never deploy it.
External integrations such as LINE/CRM, Cloudinary and Master Stock are not offline fixtures;
do not use them for synthetic writes. Ordinary `npm run dev` retains the existing live-data mode.

References: https://firebase.google.com/docs/firestore/quotas and
https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h#firestore
