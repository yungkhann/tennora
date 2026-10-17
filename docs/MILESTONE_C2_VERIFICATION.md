# C2 — clubs, players and season rosters

17 October 2026. Part of Task C; photos/consent, versioned settings/stages and season-start readiness remain C3.

## Delivered

Migrations 202610170005–202610170008 add clubs with three unique age-group subteams, season entries, one-club trainer profiles and coached-subteam assignments, independent player records, season roster history, dropout events, linked/free-name trainer references and initial/import rating provenance schema. The importer is not implemented. Regenerated database types; localized club/player/roster screens, validated Server Actions, private proxy matching and staff navigation use the caller's JWT.

Organizer/Main Judge manage all clubs. Trainers see/edit their own club and roster only within their coached subteams. Account roles remain separate: operational team management does not grant account administration. Trainer assignment cannot cross a parent club and replacement preserves before/after audit. Safe trainer-name lookup exposes no email/contact and remains scoped. Player DOB and private base tables are unavailable anonymously. Players create no Auth account.

Roster assignment checks current club, registration, active status, year-derived exact age group, one active membership per player/season and maximum ten per subteam/season. There is no roster gender quota. DOB/season-year edits cannot invalidate active age-group assignments. Membership ending/dropout preserves old rows. Organizer-only transfers end active memberships and move the player's current club atomically; the receiving club selects the new eligible roster. Former trainers lose access to the player's private row. Tournaments will consume this active season roster, without a separate submission.

New players start at 1000 with exactly one initial rating history. The UI cannot submit a rating/status/actor override. Dropout records effective date, reason and actor, ends active memberships and rejects future selections; a dropout date cannot predate birth. Reactivation and locked-match replacement semantics are not added by this batch.

## Evidence

- Final typecheck, zero-warning lint, production build and 57 unit tests pass.
- 178 pgTAP assertions pass on the existing local database. All eight migrations were also applied from scratch to a separate fresh local Supabase project; its then-current 177 assertions passed (the final added assertion checks a pre-birth dropout date against the same migrated function). Original local database was never reset. Temporary stack stopped afterward.
- Both desktop and mobile club workflows pass: real Organizer club creation, season registration and trainer assignment; Trainer player creation and linked trainer reference; eligible roster selection; other-club denial; Organizer transfer; former-club private access removal; receiving Trainer roster selection; dropout and preserved membership/rating/status history. Test cleanup uses a separate timeout allowance. Captured and visually inspected mobile roster screenshot; no horizontal overflow.
- Full regression: 12 desktop/mobile public/season/club cases plus the real staff Auth/recovery scenario pass. Auth tests run separately from club fixtures so the service-only first-Organizer bootstrap has its required empty-staff state.
- `npm run test:roster-concurrency`: two real transactions overlap about 1.95 seconds; one fills slot ten, the other waits then fails `Roster capacity reached`; exactly ten active memberships remain. Test fixtures are deleted.
- `npm run test:league-scale`: through authenticated RPCs, create 24 clubs, 72 subteams, 360 eligible active players and 360 initial rating histories in a synthetic transaction, validate counts/age bands, then roll back. Local SQL execution took 326 ms; this is a functional fixture check, not HTTP throughput or event-day load evidence.

## Corrections and limits

SQL tests caught an unqualified identifier in trainer/subteam validation. Migration 006 fixes it and adds independent database triggers enforcing parent-club consistency. Migration 007 preserves explicit nullable linked/free trainer-reference fields across generated RPC types. Browser tests use accessible combobox selectors and await the committed dropout status rather than the similarly named disclosure control. Two timed-out disposable fixture groups were explicitly cleaned up before final verification.

Automatic approval review rejected a proposed relaxation of rating bounds; it was removed from the applied migration. Existing bounds remain, and the user subsequently chose standard 400-point Elo, whole ratings and a minimum of zero (C10). Actual rating updates/rounding remain Task E.

Club mutations use a league-wide administration lock plus resource row locks. This deliberately serializes low-frequency roster/transfer edits; scoring will use separate match/player locks and must meet its own latency gates. Photo/consent, stage/settings/start gates and public-safe projection delivery are not implied by this batch. The first real Organizer still requires an explicit operator/user identity; no legacy owner is promoted automatically.
