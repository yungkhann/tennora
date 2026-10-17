# D1 — frozen seeds, draft publication and match graphs

17 October 2026. Part of Task D; lineups/reveal/replacements and standings/result advancement remain subsequent batches.

## Delivered

Migrations 013–014 add immutable crossover-map data, draw revisions, seed/player snapshots, stage groups, team matches and source dependencies. Organizer/Main Judge use localized Draws pages; Trainers cannot operate these routes. Generation requires a started season and its latest locked age-group stage plan, then computes each club's top three eligible boys/two eligible girls from the active season roster. Missing seed players reject and roll back the entire generation. Totals, chosen identities/ratings, random tie lots, seeds and snake assignments are retained. Later rating changes do not alter them.

Round-robin generation covers each pair once, with no club twice in a group round. The confirmed data map routes quarterfinals A higher/B lower, C higher/D lower, B higher/A lower and D higher/C lower. Recursive winner/loser dependencies produce classification matches for all eight bracket places. Per age: four groups/60 matches plus three brackets/36 matches, 96 total. Bracket participants remain undecided until upstream results; no score or result is manufactured by generating a graph.

Regeneration appends a private draft revision. Publication atomically rechecks the latest revision, stamps it and audits; a partial unique index also enforces one published revision per plan. Publication prevents regeneration. Drafts are readable only by Organizer/Main Judge; other active staff can read published graphs, while anonymous base-table access remains denied. Public-site projections are G.

## Evidence

- Typecheck, zero-warning lint, 81 unit tests, production build and formatting/diff checks pass.
- All 318 pgTAP assertions pass on the existing local database and a separate project recreated from empty volumes with all fourteen migrations. The original project/account data was never reset; the disposable project was stopped afterward.
- Eighteen desktop/mobile browser regressions plus the separate real Auth/invitation/session case pass. The draw workflow logs in as Main Judge, generates 24 entries/96 matches, verifies group seeds, changes a live rating through trusted fixture setup, proves the earlier snapshot stays frozen, appends a new draft, rejects old-revision publication, publishes and proves regeneration is locked. It inspects crossover/classification paths and verifies Trainer route denial.
- SQL tests independently verify all pairings/counts, five frozen identities, random tie lots/audit, no same-round conflicts, all classification final pairs and backward same-stage dependencies. Adding lower-rated boy/girl reserves does not displace the top five. Invalid/missing seed rosters roll back fully; stale commands/direct writes and unauthorized publication fail.
- `npm run test:draw-concurrency`: two real transactions overlap about 1.94 seconds. Publication holds the lock; regeneration waits, then rejects `Published draw is locked`. Exactly one published graph/revision remains. Synthetic fixtures are removed.
- Desktop/mobile classification screenshots were visually inspected: labels, crossover sources, winner/loser paths and all placement pairs are readable, with no horizontal overflow. Browser fixtures are cleaned up, including their dependent graph rows. The original requirements PDF hash remains unchanged.

## Corrections and limits

SQL tests caught a CASE expression resolving audit roles to text. Additive migration 014 explicitly casts the trusted role to the staff enum. The publication audit assertion reads as Organizer; Main Judge audit-table privacy was retained.

Seeding takes the existing roster administration lock before the parent-season lock, then shared player locks in stable ID order to keep rating totals/identity snapshots consistent. This is a low-frequency generation operation, not a per-point lock strategy. Scoring and result/K concurrency require their own E proofs.

Standalone round-robin and the confirmed four-group crossover map are implemented. Other composite maps and standalone seeded knockout draws fail explicitly until their map is implemented; general template validation is not a claim that every possible map is operational. No lineups, scoring, official standings/placements, automatic advancement, public pages or hosted event-day capacity are claimed by D1.
