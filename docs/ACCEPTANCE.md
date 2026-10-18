# Release acceptance

A–G implement the product. H/I are not complete until actual hosted and venue evidence passes. Local automated proofs are under `output/readiness/`; none substitutes for hosted acceptance. Run `npm run release:check -- /secure/path/release.json` on the exact release commit. It fails closed on missing evidence, hashes, obsolete measurements, wrong commit or exceeded limits. The JSON contract is `scripts/lib/release-evidence.mjs`; each section includes a relative artifact path, SHA-256, reviewer and ISO measurement time. Keep private operational artifacts outside this repository. The validator verifies structure and integrity, not the truth of a reviewer statement.

Required independent evidence:

- Provider: distinct HTTPS staging/production, approved region and budget, separate backend projects.
- Privacy: reviewed consent/publication and retention process before real player data.
- Recovery: purchased and tested PITR, measured RPO ≤300 s and full Auth/database/Storage RTO ≤1800 s; encrypted off-site 14 daily/8 weekly copies, RLS/grants and object reconciliation.
- Hosted load: 2,000 viewers, 30 simultaneous matches for ≥1,800 s, zero command/read failures; record client geography and actual database commit instrumentation. RPC round-trip timing is not database commit time.
- p95/p99 limits (ms): database commit 100/250, tap acknowledgement 300/600, tap-to-viewer 1000/2000, initial snapshot 1000/3000, reconnect/resync 3000/8000, cached public REST 150/400. Supply ≥100 observations for each, raw samples and percentile methodology.
- Venue: 30 actual tablets, primary/backup uplinks, forced loss/resync and device replacement tests.
- Monitoring: 99.9% event-day target with defined window; alert delivery tested to named on-call authority.
- Cutover: complete staging rehearsal, rollback and Organizer acceptance for this release.

No credentials or approved provider/venue evidence are configured in this checkout. Hosting, paid recovery features, consent approval, alert delivery and venue acceptance cannot be certified by local tests. Do not launch with these gates unresolved.
