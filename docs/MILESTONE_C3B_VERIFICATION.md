# C3b — tournament settings, stages and season start

17 October 2026. Completes Task C with C1, C2 and C3a. Draw generation, match lineups, scoring and scheduling remain subsequent tasks.

## Delivered

Migration 012 and typed caller-JWT Server Actions add immutable per-tournament settings revisions, reusable stage templates, per-age stage-plan revisions and individual stage records. Localized Organizer screens are linked from Seasons. Templates support atomic round-robin/knockout and ordered round-robin-to-parallel-knockout composites; validation rejects duplicate/missing placement bands, cyclic sources, wrong ordinals and non-power-of-two brackets. The confirmed four-groups-of-six format produces three eight-entry bands (1–2, 3–4, 5–6), for each age group. Previous template/plan records are preserved.

Settings require an explicit positive finite K; no K value is invented. Confirmed defaults are twelve tables, sixty minutes of rest, finals first after required rest and Asia/Almaty. Expected revision checks reject stale edits. After season start the RPC allows only a new prospective K version; tables/rest/finals/timezone are locked. Original versions and their audit remain. Task E must consume and retain settings ID/K when calculating each result; this batch does not calculate ratings.

Season start checks at least one tour, settings and all three age-group stage plans per tour, with registered subteam counts matching every plan's capacity. It atomically pins current settings/plan IDs, locks the season and appends audit; retries do not duplicate the snapshot/audit. Configuration and registration share the parent-season lock, so the start check cannot race a registration/configuration change. Full player lineups are a match-start requirement, not a season-start precondition. Rosters retain their existing transfer/dropout rules.

## Evidence

- Typecheck, zero-warning lint, 67 unit tests, formatting/diff checks and production build pass.
- All 275 pgTAP assertions pass on the existing database and a separate project recreated from empty volumes with all twelve migrations. The original database/accounts were preserved; the temporary project was stopped afterward.
- Sixteen desktop/mobile browser regressions plus the separate real Auth/invitation/session case pass. The configuration workflow creates the confirmed reusable template through the UI, applies all three ages, proves missing registrations prevent start, registers 24 clubs through authenticated RPCs, starts through the UI, checks locked forms and appends a future K revision from 32 to 64. The original version and pinned snapshot are independently checked.
- SQL tests independently deny Main Judge, Trainer, Line Judge, inactive and anonymous misuse; deny direct settings/stage/snapshot edits and deletes; reject stale revisions, invalid K/timezones/limits, incomplete ages and malformed routing. Started-season non-K edits fail while K versioning/audit succeed.
- Desktop/mobile screenshots were visually inspected; history, stage bands and controls remain readable without horizontal overflow. Browser fixtures and their synthetic clubs/templates/staff are removed. The first real Organizer account/invitation remains intact.
- Existing C2 capacity/concurrency and 24-club/72-subteam/360-player fixture evidence remains in MILESTONE_C2_VERIFICATION.md; these unchanged contracts are covered by the full browser regression too.

## Corrections and limits

Browser verification found that keying the settings form by its newly saved version discarded success feedback during revalidation; the form now retains action state. The test's implicit-label select lookup was replaced by an accessible combobox selector. The final workflow passes on both device sizes.

Stage configuration stores qualification bands; Task D implements the now-confirmed seed freeze, snake draw map, classification matches and tie-breaks. This batch does not claim a generated/published draw or any match operations. Version effective time records when the command ran; K consumption and concurrent game-result behavior must be proved in E. Hosted latency, scale, function/Storage deployment and restore targets remain H/I gates.
