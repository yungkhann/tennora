# Task C batch inventory and gates

Task B committed as `f1ca47f`. C07 confirms age on December 31 of the season year, U13 under 13 / U15 13–14 / U17 15–16, no playing up and max ten active players per club's age-group roster.

Implement C in reviewable batches, each with its own verified commit. C remains in progress until all C deliverables pass.

## C1 — seasons and tours

Files: `supabase/migrations/202610170004_seasons_tours.sql`, `supabase/tests/003_seasons.sql`, regenerated database types, `src/features/seasons/{validation,actions,forms}.ts*`, `src/app/[locale]/(staff)/organizer/seasons/page.tsx`, `src/domain/eligibility.ts`, `tests/unit/eligibility.test.ts`, `tests/e2e/seasons.spec.ts`, locale dictionary, staff navigation/workspace, proxy matcher, implementation/verification docs.

Organizer creates/edits seasons and ordered tours. Year is the explicit eligibility reference, independent of dates; age uses birth year only. Validate date bounds, unique ordinals, at least one tour before start, and lock both season/tour configuration after start. No delete UI. Main Judge/Trainer/Line Judge cannot mutate season configuration through direct RPCs. Preserve actor/before/after audit. Season start is explicitly unavailable until C3 adds required stage/settings readiness. Do not present tournament operation/scoring as implemented.

## C2 — clubs, players, rosters and trainer scope

Planned files: `202610170005_teams_players.sql`, `src/features/{teams,players}/`, team/subteam routes, trainer assignments, player/status/rating provenance records, related SQL/browser/concurrency fixtures. Expand exact inventory before editing. Team registration and roster history are season-scoped. Eligibility/capacity checks remain authoritative in SQL with shared TypeScript examples. No player Auth account. Main Judge may manage all teams; trainer authority remains in one assigned parent club. C08 now permits Organizer-approved mid-season transfers with history and uses the active season roster directly; no separate tournament roster is required.

## C3 — photos/consent, settings/stage configuration and scale proof

Expand inventory before editing. Private object storage/consent, controlled approved photo delivery/revocation, versioned settings and pre-season stage configuration; 24 clubs/72 subteams/360+ synthetic players. No real minors' data or consent evidence is introduced by fixture testing. D06/D09/D10 gate affected defaults/operational policy; do not invent them.

C1 is implemented and verified in MILESTONE_C1_VERIFICATION.md. C2 clubs/players/rosters is now verified in MILESTONE_C2_VERIFICATION.md. C3a photos/consent is verified in MILESTONE_C3A_VERIFICATION.md; C3b settings/stages/start readiness is verified in MILESTONE_C3B_VERIFICATION.md. Task C is complete.

### C2 exact first batch

`supabase/migrations/202610170005_teams_players.sql`, `supabase/tests/004_teams_players.sql`, `src/lib/supabase/database.types.ts`, `src/features/teams/{actions,forms,validation}.ts*`, `src/features/players/{actions,forms,validation}.ts*`, localized `/team`, `/team/[teamId]`, `/subteam/[subteamId]` pages, locale dictionary, staff nav/proxy matcher, roster capacity/transfer concurrent-transaction script, unit/browser tests and milestone evidence. Implement and verify the database contract first, then wire its UI; do not mark C2 complete on schema work alone.

Trainer profiles link an existing active Trainer account to one parent club; selected subteam links must remain within it. Global team managers are Organizer/Main Judge. Players belong to one current club; Organizer transfers end existing active roster memberships and move the current club in one audited transaction. The receiving club then selects the player into its eligible season roster, subject to capacity. Prior memberships/results remain. Tournaments consume that active season membership directly. DOB edits must preserve all active roster eligibility. Per-season roster uniqueness and per-subteam/season capacity serialize under deterministic row locks. Private player rows remain unavailable anonymously; public projections arrive in G. Dropping out ends active memberships and appends actor/date/reason; reactivation is not introduced without a policy.

C2 also includes migrations 202610170006_trainer_scope_hardening.sql, 202610170007_trainer_reference_payload.sql and 202610170008_dropout_date.sql; src/components/mutation-form.tsx; scripts/test-roster-concurrency.mjs and scripts/test-league-scale.mjs; tests/unit/players.test.ts and tests/e2e/teams.spec.ts. Scale fixture proof moved forward from C3; no real data was seeded.

### C3a — photo and consent workflow inventory

Files: `202610170009_player_photos.sql`, `202610170010_photo_projection_encoding.sql`, `202610170011_photo_upload_limits.sql`, `supabase/tests/005_photos.sql`, `src/features/photos/{actions,forms,image,validation}.ts*`, staff/public photo Route Handlers, anonymous server client, team detail integration, locale strings, proxy refresh matcher, `next.config.ts`, pinned Sharp dependency and lockfile, regenerated types, `tests/unit/photos.test.ts`, `tests/e2e/photos.spec.ts` and milestone/architecture/route/status docs.

Trainer uploads original photo and written guardian-consent evidence to private Storage; Organizer reviews and approves publication. Public delivery uses a small, sanitized JPEG projection in PostgreSQL, served through an anonymous no-store Route Handler. Originals and evidence never enter anonymous Storage policies. This avoids introducing an admin-data client for media delivery and makes withdrawal immediately remove public reads without relying on public-bucket/CDN deletion. Each approved projection is bounded to 256 KiB; original/evidence retain separate Storage-backup requirements. Uploaded evidence has no inline public endpoint. Record pending upload/review/approved/rejected/revoked states and immutable actor/time/status audit; only Organizer changes publication state.

Original uploads use the caller's JWT and path-bound RLS; an upload receipt reserves hashes/paths for retry consistency. The public JPEG is prepared from the privately stored original during Organizer review, with metadata removed, decoded format/pixel/size limits and no raw SVG/HTML delivery. Public route reads only the safe JPEG projection, never Auth/admin credentials or evidence. Storage objects remain private and immutable through ordinary staff APIs. No real player photos/evidence are seeded by tests.

Each original/evidence file is limited to 2 MiB, the combined Server Action to 5 MB. Migration 010 removes PostgreSQL base64 line wrapping at the maximum projection size; 011 aligns database receipts and the private bucket with the upload limit. Browser tests exercise two full-size files through the actual action and Storage. Hosted adapter/native Sharp behavior remains a deployment gate.

### C3b — settings, stage templates and season readiness inventory

Exact files: `supabase/migrations/202610170012_tournament_configuration.sql`, `supabase/tests/006_configuration.sql`, regenerated database types, `src/domain/stage-templates.ts`, `src/features/configuration/{validation,actions,forms}.ts*`, localized Organizer tournament configuration route, season-page links, locale strings, `tests/unit/configuration.test.ts`, `tests/e2e/configuration.spec.ts`, and milestone/database/routes/status docs.

Implement immutable per-tournament settings revisions (K, default twelve tables, 60-minute rest, finals first after rest, Asia/Almaty); after season start only prospective K changes are allowed. Preserve the settings ID and K for future result calculations in E. Reusable immutable data templates support round-robin, knockout and ordered round-robin-to-parallel-knockout composites. Placement bands route every source entry exactly once; bracket seed order and tie-breaks remain D04, with draw generation gated there. Each tour/age group receives an immutable stage-plan revision with individual stage rows. The confirmed format is four groups of six, followed by three eight-entry brackets with placement bands 1–2, 3–4, 5–6.

Season start requires at least one tour, settings and all three age-group stage plans for every tour, and registered subteam counts matching their entry capacities. It records an immutable snapshot of the exact settings/plan IDs and locks pre-season configuration. Do not require full rosters at season start: C12 requires the full lineup at match start, and active season rosters can change later. Start readiness is not permission to generate draws before pending seeding/tie-break rules are resolved. Verify direct API role denials, immutable history, started-config locks, prospective K behavior, invalid template maps, readiness and responsive Organizer forms before completing C.
