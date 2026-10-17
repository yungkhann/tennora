# Database relationships and security

## Implemented baseline

202610170001_foundation.sql establishes profiles -> auth.users, organizations, organization_members and audit_logs. These are the original Phase 1 tables with tenant RLS. Their data/history remains preserved. Task B adds 202610170002_league_staff.sql and 202610170003_staff_profile.sql: staff_accounts, normalized staff_roles, provisioning/reset staff_jobs, additive league audit fields and audited RPCs. See MILESTONE_B_VERIFICATION.md. C1 adds seasons/tours (004); C2 adds clubs, subteams, trainer scope, private players, roster/status history and rating provenance (005–008). See MILESTONE_C1_VERIFICATION.md and MILESTONE_C2_VERIFICATION.md. C3a adds private photo/consent receipts and a sanitized public JPEG projection (009–011); see MILESTONE_C3A_VERIFICATION.md. C3b adds immutable tournament settings, reusable stage templates, stage-plan revisions and season-start snapshots (012); see MILESTONE_C3B_VERIFICATION.md. D1 adds frozen draws, seed snapshots, groups, team matches and source dependencies (013–014); see MILESTONE_D1_VERIFICATION.md. Historical design is archived in archive/PHASE_1_DATABASE.md.

## Target league relationships

One league has seasons. A season registers clubs; each club has U13/U15/U17 subteams. Roster memberships retain season/effective eligibility instead of losing history when players age or transfer. A tour has ordered stages; stage entries snapshot seeding ratings. Team matches connect subteams; lineups select players; singles games contain sets and append-only point events. A UI tournament is a tour.

| Area               | Planned records and essential invariants                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Staff              | staff_accounts keyed to Auth/profile ID, active/provisioning status; normalized coexisting staff_roles rows (D01/C06); no self-granted roles or metadata privileges.                                                           |
| Trainer scope      | trainer_profiles, team/subteam trainer assignments; every subteam assignment belongs to a club that trainer may coach.                                                                                                         |
| Teams              | teams, subteams unique(team, age_group), season_team_entries unique(season, team). No organization tenant is required for new league data.                                                                                     |
| Players            | players with name, gender, hand/style, DOB, sports level, rating/status/external ID; roster memberships, player_status_events; max 10 active eligible members enforced under concurrent assignment. No Auth ID requirement.    |
| Trainer references | player_trainer_refs: either a linked trainer or free first/last name, never both.                                                                                                                                              |
| Photos and consent | consent/version/evidence with actor/time plus private Storage references; public photo projection includes only approved assets.                                                                                               |
| Competition        | seasons, tours, stage_templates, stages/config, stage_groups, stage_entries; unique stage/ordinal positions and seed snapshots; config locks at season start.                                                                  |
| Settings           | immutable tournament_settings versions: K, table count, rest, finals priority and effective time. Prospective K changes are the explicit frozen-config exception and are audited. Scope/rounding decision D06.                 |
| Results            | group standings, tour_placements, season_standings with source revision, head-to-head/tie-break evidence. Advancement consumes finalized standings, never stale background output.                                             |
| Matches            | team_matches: scheduled/called/in_progress/finished, participants, table/times, winner/result type, version; correct decided-match and resource invariants.                                                                    |
| Lineups            | lineups unique(match, subteam); slots 1..5 with fixed genders; one committed reveal after both submit; locked slots only change through an authorized replacement path.                                                        |
| Replacements       | lineup_replacements preserve old/new player, reason, actor/time; mid-game result/rating attribution requires D08.                                                                                                              |
| Games and sets     | singles_games slots 1..5 with pending/in_progress/finished/cancelled; game_sets numbered 1..5 with 11-point, win-by-two completion checks. First server input is distinct from derived current server.                         |
| Events             | point_events with ordered seq and point/undo_point/undo_set/timeout actions, actor, before/after and timestamps; append-only. Exact timeout and completed-undo semantics require D07/D08.                                      |
| Command receipts   | unique(match, command_id), normalized payload/hash, result version/snapshot; conflicting payload reuse rejected, duplicates return prior result before version comparison.                                                     |
| Ratings            | rating_history: initial/import/game provenance, before/after, game, K/effective settings; rating_imports schema only. Original per-game result uniqueness plus compensating revisions chosen in D07; do not overwrite prior K. |
| Hall               | hall_tables default 12; table_assignments with auto/manual mode; line_judge_assignments unique(judge, venue_day); deterministic table/player resource locking and conflict constraints.                                        |
| Public and jobs    | public_match_snapshots and public-safe roster/ranking projections; durable jobs/outbox with deduplication and revision markers. No private-table anonymous publication.                                                        |
| Audit              | Extend audit_logs additively for league events with actor role, entity type, before/after and trusted request context; retain legacy organization context/history. No client update/delete grants.                             |

## Permission model

Anon can read only published, public-safe data. RLS protects rows; safe projections/column grants protect DOB and contacts. Authenticated without active staff grants no league authority. Organizers manage league/accounts/settings; Main Judges have operational authority only; Trainers have their club scope; Line Judges need table/day assignment. IDs supplied in URLs/forms do not authorize access.

Use user-JWT clients for business operations. Definer RPCs use fixed search paths, schema-qualified relations, explicit revocation of PUBLIC/anon grants and their own role/resource checks. Direct writes that bypass lock, score, rating, permission or audit invariants are revoked. Derive actor IDs from auth.uid(). Provisioning admin secrets belong to isolated server-only Auth tooling.

Account/player deactivation preserves results and references. Physical Auth deletion must not cascade away league evidence. No data-destructive migration is authorized by a document update; inventory and back up old data before retiring legacy interfaces/grants.

## Verification and order

Migrations are introduced per milestone B-I in TABLE_TENNIS_IMPLEMENTATION_PLAN.md, never as one unverified schema dump. Add pgTAP tests for each policy/constraint plus competing real transactions for resource capacity, lineup reveal, scoring receipts and completion. Verify migrations from both empty local Supabase and the existing Phase 1 schema. Regenerate types only after successful migration. See the FR evidence matrix and go-live gates in the plan.

## Photo publication (C3a)

`player_photo_assets` reserves immutable private Storage paths, MIME/size/hash receipts, consent version/declaration and review state. The caller’s JWT authorizes uploads and private downloads; a Trainer may upload only within their club, and only the uploader or an Organizer may download evidence. Main Judge authority alone does not grant upload/review. The `player-private` bucket has no anonymous read policy. Files are limited to 2 MiB each.

Organizer review verifies stored hashes and prepares a metadata-free JPEG, at most 512 pixels per edge and 256 KiB. The review RPC atomically records approval/audit and replaces `public_player_photos`; revocation removes that projection in the same transaction. Public RLS permits only currently approved projections. Anonymous delivery reads this bounded projection with no Auth/admin client. Originals/evidence remain private and retained; database recovery must reconcile separate Storage backups. Two object uploads and their receipt are a retryable cross-service workflow, not a single database transaction.

## Tournament configuration (C3b)

`tournament_settings` appends per-tour revisions with K, tables, rest, finals priority, venue timezone, actor and effective time. Expected revision checks reject stale edits. Once the season starts only K may change; existing rows and the season-start snapshot are retained. Task E must pin the settings ID/K at result calculation, under the same tour row lock used by settings changes; no historical result is recomputed for a K edit.

`stage_templates` stores immutable validated data: a round-robin or power-of-two knockout root, optionally round-robin followed by parallel knockout bands covering every source place exactly once. Supported bounds are 32 groups of up to 32 and at most 1024 entries; these are validation limits, not measured tournament capacity. Each `tour_stage_plans` revision references one template for one tour/age, with individual immutable `stages` rows. Draft replacement preserves earlier plans. Draw seed order/snapshots, classification matches and advancement are Task D.

Season start requires a tour, settings and all three age plans for every tour, with registered subteam counts matching each plan’s entry count. Configuration commands and registration share the parent-season row lock. Start rechecks readiness, pins the exact latest settings/plan IDs in `season_configuration_snapshots`, changes season status and audits in one transaction. Repeated start is a no-op. No roster-gender precondition is imposed here; full lineups are required at match start. Direct staff writes/deletes to these tables are denied.

## Draw snapshots and graphs (D1)

`draw_revisions` append private drafts for the latest frozen age-group stage plan. Generation uses active eligible season membership, the top three boys/two girls, and records `draw_entries` with total/seed/random tie lot plus five `draw_seed_players` identities/ratings. The roster administration lock is acquired before the season lock; player share locks in ID order hold ratings consistent across both snapshots. Future scoring uses player row locks, never this league administration lock. Draft regeneration retains old records.

`draw_seed_maps` is immutable crossover data; its exact contents are copied into the revision/audit. `stage_groups` and `team_matches` contain round-robin pairings and full classification graphs. `match_sources` points to a group place or an earlier match winner/loser. Bracket participants remain null until authoritative result advancement in a later batch. No application score/participant edit is granted here. Standalone round-robin and the confirmed four-group/two-places-per-bracket map are supported; other draw maps fail explicitly.

Organizer/Main Judge generate and publish; only these roles read drafts. Publication locks the plan and rechecks the latest revision, then stamps one revision/audit; a partial unique index permits at most one published revision. Regeneration after publication fails. Active staff can read only published graphs unless they manage draws. Anonymous base-table access remains denied; G supplies safe public projections. A published draw is not permission to read hidden lineups.

## Lineups and joint reveal (D2)

Migrations 015–017 add `lineups`, five gendered `lineup_slots`, `singles_games`, `lineup_replacements` and match lineup/reveal versions. Only an active explicitly assigned Trainer may submit a side; Organizer authority alone grants no submission or early-read bypass. Five distinct eligible active season-roster players must follow boy/girl/boy/girl/boy. Original ordered requests are retained for exact retries. The first side locks; the second submission locks the match, creates all five singles, stamps one joint reveal and records audit in the same transaction.

Before reveal, row policies permit a Trainer’s own assigned side only; an official role adds no visibility, including on combined accounts. General pre-reveal audit contains status and opaque references, with no selected-player identity or brute-forceable request hash. No singles rows exist before both sides submit. After reveal, slots expose captured names/gender/IDs without opening opposing private DOB/contact/player rows. A narrowly authorized `lineup_match_names` RPC supplies club labels only for matches the caller may operate. Anonymous base access remains denied.

Organizer/Main Judge can replace only a pending singles player after joint reveal. Reason/current lineup version, gender, eligibility and duplicate checks are enforced in SQL; slot, pending singles, history, match/lineup versions and audit update atomically. Original submission/old identity remain. Exact replacement receipts return even after match completion; new mutations cannot change started singles. Match-start forfeits, withdrawal results, rating transitions and completed-result corrections are subsequent E contracts.

Private polling returns only submission/reveal flags and versions, never selected players. It reauthorizes every request and is no-store. The browser polls while visible, backs off on failures and refreshes the authorized server view on a lineup-version change. It uses no browser Auth token. See MILESTONE_D2_VERIFICATION.md.

## Official result and advancement contract (D3a)

Migration 018 introduces append-only `team_match_results` revisions with previous/current pointers and match/revision integrity triggers. Staff have read permission only; no result-write RPC bypasses future scoring. Forfeit tie-break awards follow I01 and do not create point events or rating history. E derives played results from authoritative singles and invokes advancement in that same transaction.

`group_standing_snapshots` preserve source match/status/result IDs, metrics, recursive mini-table evidence and exact tie receipts. `group_standing_heads` select the current snapshot. An unchanged refresh returns its existing ID without another audit. Incomplete groups and unresolved complete groups advance nobody. Final exact subsets use one Organizer-only `group_tie_draws` receipt, with independently generated UUID lots and one audit; Main Judges may refresh but cannot draw final ties. Preflight dependent locks before generating lots prevents outcome-dependent retries. Staff cannot change receipts or historical results directly. Anonymous base-table access is denied.

Ratios use PostgreSQL numeric cross-products and TypeScript BigInt cross-products for safe integer inputs. Positive/zero is infinity and zero/zero is neutral one. Recompute each remaining tied subset from mini-table wins before proceeding through singles/set/point ratios. Shared fixtures test order, metrics, unresolved subsets and evidence, including a tie that splits then requires recalculation.

Explicit `match_sources` edges retain the standing snapshot or result that supplied each participant. `private.advance_team_result` routes actual winners/losers and records every classification pair's global placement, including the three bracket offsets. Source readiness independently checks parent completion, current result/snapshot IDs and actual participant identity. New lineup submissions reject stale sources after exact receipt handling. A changed participant cannot overwrite a locked, started or completed dependent match; the refresh and its new snapshot roll back together. E supplies correction/reopen resolution.

All E/F commands must take `private.draw_command_lock(draw_id)` before match/player row locks; per-point commands must not acquire the league-wide administration locks. This draw-scoped guard coordinates completion/advancement with source-dependent lineups. The later Elo replay barrier is an additional E requirement, not implemented by this batch.

## Standalone seeded knockout (D3b)

Migration 019 adds read-only `knockout_seed_maps` for 2/4/8/16/32 participants and freezes the selected order in each draw. `match_sources` gains an exclusive frozen-entry source alongside group-place and prior-result sources. Initial sides resolve only from same-draw entries; later winner/loser edges and all-place classification remain unchanged. Readiness independently verifies entry/draw/participant identity. No base table becomes anonymous-readable and staff cannot rewrite the reference maps. Unsupported root sizes fail before any partial draw is written.

The confirmed 4x6 and three classification brackets use their existing crossover map. Standalone knockout maps separate the first two seeds into opposite halves and support all places, with 80 matches for 32 participants. The broader template-validation ceiling remains a configuration grammar limit; it does not promise an implemented seed map for every size. See MILESTONE_D3B_VERIFICATION.md.

## Organizer seed adjustment (D3c)

Migration 020 adds immutable `draw_seed_adjustments` receipts and an Organizer-only `swap_draw_seeds` RPC. Two distinct in-range seed positions, a reason, the latest source draft, expected revision and unique request ID are required. The command appends a draw revision, copies frozen entry/player/rating/tie-lot/map data and rebuilds its graph through `private.populate_draw_graph`, shared with ordinary generation. It does not read live ratings. Earlier drafts and graphs remain unchanged; the receipt links the chosen source and records actor/time/reason/positions. The audit preserves before/after seed order.

Exact receipt retries return the existing revision even after publication; changed payloads fail. Publication and generation share the administration/season/plan lock ordering, so a waiting adjustment cannot overwrite a published graph. Main Judges may review/publish but cannot manually swap. Staff cannot directly mutate receipts or call the graph helper; anonymous table/RPC access is denied. See MILESTONE_D3C_VERIFICATION.md.
