# Operations runbook

Use Node 24 and separate staging/production Supabase projects. Apply the additive migrations in order after staging verification; never reset an existing production database. Configure exact trusted HTTPS origin/callbacks, private server Auth secret, anonymous publishable key, SMTP and disabled public signup as described in README. Realtime must publish only the approved `public_match_snapshots` table. Keep private Storage buckets private. Never run disposable local fixture scripts against hosted projects.

## Verification and deployment

Run `npm ci`, `npm run check`, database/parity/concurrency tests and both Playwright suites against a healthy local backend. CI starts Auth, Storage and Realtime before these checks. Follow [acceptance gates](ACCEPTANCE.md) for hosted load/recovery and physical venue evidence. Pin deployment to the accepted commit. Netlify requires its Next.js SSR adapter; do not export static HTML. Set server secrets in the hosting secret store, never in `NEXT_PUBLIC_` variables. Verify direct anonymous/private access and all four staff scopes on staging before cutover.

`GET /api/health` returns no-store 200 only after a database clock query succeeds, otherwise 503. Logs contain operation, random request ID, status and duration only. Request bodies, player names, sessions and tokens are excluded. `Server-Timing` measures transport and RPC round trips; use provider database telemetry to measure commits separately. Instrument uptime, HTTP errors/latency, DB/Storage capacity, Realtime connections/lag and background-job lag. Provision external event-day probes and test real alert delivery; this checkout does not configure an alert recipient.

## Local recovery rehearsal

Run `npm run test:restore` with local Docker services and ignored `.env.test.local`. It exports database and Storage bytes, encrypts in memory with AES-256-GCM, rejects a tampered envelope, restores into a generated temporary database/directory, compares critical contents and policies/grants, then removes only its own temporary targets and synthetic probes. `output/readiness/local-restore.json` is sanitized evidence. The ephemeral local key is discarded; this test does not create a retained production backup.

Hosted operations must provision managed PITR plus separately encrypted off-site database and object copies, with keys in a separate managed secret store. Retain 14 daily and 8 weekly copies. Rehearse a timestamp/transaction-position restore into an isolated project, restore Auth/functions/grants/RLS/consents and reconcile missing/newer Storage objects before reopening approved photos. Measure end-to-end recovery; do not overwrite the live project to test recovery. Verify RPO ≤5 minutes and RTO ≤30 minutes including object reconciliation.

## Local traffic rehearsal

In one terminal run `npm run serve:readiness` (isolated production build and trusted local TLS certificate), then `npm run test:load:local -- --viewers=2000 --seconds=1800` in another. This uses disposable synthetic teams, normal Auth sessions, 30 real scoring matches and anonymous committed Realtime with forced reconnect. Run without other fixture tests or database writes. Reports distinguish local emulation from hosted/venue acceptance. Ctrl-C the harness when finished. Fixture recovery metadata is stored in the OS temporary directory if interrupted; inspect and use the guarded cleanup helper only for the exact synthetic fixture. Never apply blanket deletion to real data.

## Incident response and cutover

The named Organizer/Main Judge controls play suspension. On tablet/network loss, stop tapping, preserve pending command IDs, reconnect and reconcile the authoritative receipt/snapshot before retrying. Transfer table ownership through the audited takeover control; never edit database scores. Device replacement uses a verified staff login and current table/day assignment. Activate the tested backup uplink when primary connectivity fails. Public polling/stale notices preserve visibility but do not authorize offline scoring.

On provider failure suspend play and alert the named on-call authority. Preserve incident timestamps and committed command IDs; restore to an isolated target before routing traffic. Reconcile any uncertain acknowledgements and physical match records through official correction review. Application rollback must retain all additive schemas and scoring/audit history. Before cutover archive recovery evidence, verify the latest encrypted backups, smoke-test RU/KK/EN and table ownership on staging, announce the accepted maintenance window through the Organizer, switch the approved deployment, and verify health/Auth/scoring/public recovery. If verification fails, route back to the last compatible application and pause mutations; do not reverse migrations destructively. Record the incident and Organizer acceptance.

## Measured local service limits

The 18 October local default Realtime tenant admitted 200 connections and rejected the 2,000-viewer attempt (`ConnectionRateLimitReached`). A 100-viewer/30-match run also hit `MessagePerSecondRateLimitReached`; commands and snapshot reads succeeded, but insufficient point fan-out samples failed the overall gate. Do not increase the pass thresholds or interpret successful acknowledgements as proof of viewer delivery. Provision and verify both connection and message-rate capacity in the approved hosted tier before the 2,000-viewer/30-minute acceptance run. A 25-viewer short smoke passed all measured local targets; it is not a capacity certificate.

The production-only npm audit reports zero published advisories. The full development audit still reports the lint dependency chain to `braces` 3.0.3 ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)); no patched package is published at the verification date. Keep lint patterns trusted and CI credentials read-only; revisit upstream rather than downgrading Next.js to the unrelated version suggested by the automated audit fix.
