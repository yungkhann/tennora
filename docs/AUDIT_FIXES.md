# Audit corrections

18 October 2026. The user authorized fixing the findings from the original-plan audit. Existing migrations and historical verification reports remain immutable. Each batch uses an additive migration and records its own measured evidence before commit. H/I hosted, recovery-provider and venue gates remain open.

## Batch 1 — scoring recovery and continuation

Exact inventory: `src/domain/scoring.ts`, `src/features/scoring/scoreboard.tsx`, `tests/fixtures/scoring.json`, `tests/unit/scoring.test.ts`, `tests/e2e/scoring.spec.ts`, `supabase/tests/024_scoring_recovery.sql`, `supabase/migrations/202610180015_scoring_recovery.sql`, this report and `docs/IMPLEMENTATION_PLAN.md`.

Fix symmetric continuing-player reservations/rest checks, deciding-set end changes (including undo), and retention of uncertain command UUIDs after throttling or temporary loss of authentication/authority. Status: verified.

Before the fix, four unit cases failed on the fifth-point end change, the SQL regression demonstrated the missing B-side rest guard, and the browser regression observed the pending UUID disappear after HTTP 429. After migration 032: all 134 unit tests and 846 SQL assertions pass; 1,745 scoring transitions, 508 Elo vectors and four team outcomes match SQL/TypeScript; real match-start and score/correction concurrency checks pass; all four affected desktop/mobile scoring/correction scenarios pass. Typecheck, zero-warning lint, production build and diff checks pass. Browser scenarios verify no-store/private snapshots, unchanged table authority, visible error/retry states and mobile overflow. No public grants or staff credentials were added. Original migrations remain unchanged.

## Batch 2 — withdrawals and team-forfeit corrections

Add match-specific retirement without global player dropout and audited correction/reopening of team forfeits, preserving prior attempts and checking downstream play. Status: verified.

Exact inventory: `supabase/migrations/202610180016_result_lifecycle.sql`, `supabase/tests/{021_public_league,022_season_public_standings,025_team_forfeit_corrections,026_singles_retirement,027_seeded_forfeit}.sql`, `src/lib/supabase/database.types.ts`, `src/features/scoring/{validation,scoreboard,messages}.ts*`, `src/features/corrections/{validation,actions,forms,messages}.ts*`, `src/app/[locale]/(staff)/matches/[matchId]/corrections/page.tsx`, `src/app/[locale]/(staff)/corrections/[requestId]/page.tsx`, `tests/unit/scoring.test.ts`, `tests/e2e/{scoring,corrections}.spec.ts`, `tests/e2e/helpers/draw-fixture.ts`, `scripts/lib/local-fixture-cleanup.mjs`, and `docs/{AUDIT_FIXES,IMPLEMENTATION_PLAN,DECISIONS,DATABASE,ROUTES}.md`.

Verification: the original regressions failed on the absent team RPC and rejected retirement side. After migration 033, all 136 unit tests and 890 SQL assertions pass. Typecheck, zero-warning lint and production build pass. Scoring/Elo/team and standings parity, real score/correction races and hall races pass. All six affected desktop/mobile browser scenarios pass, including HTTP-only private flows, retirement with retained roster, winner revision and fresh-lineup reopening. The clean isolated replay of all 33 migrations and all SQL suites also passes. SQL covers late-audit rollback, direct-RPC Trainer/anonymous/private-applier denial, stale digests, duplicate receipts, Organizer-only started-play resolution, preserved rest, repeated corrections and seeded source retention. The browser caught the need to retain frozen seed-entry sources when copying a standalone knockout root; this now has a SQL regression. Public directory assertions now scope their own fixture IDs so unrelated retained league data does not fail the suite. No business operation uses the Auth admin client.

## Batch 3 — public history and documentation

Keep historical public profiles available after roster exit/transfer/dropout using approved fields, independently of current ranking eligibility. Record the synchronous ranking/photo implementation as an explicit architecture decision and reconcile status claims. Expand exact inventory before implementation. Status: pending.
