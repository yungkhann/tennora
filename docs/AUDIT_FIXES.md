# Audit corrections

18 October 2026. The user authorized fixing the findings from the original-plan audit. Existing migrations and historical verification reports remain immutable. Each batch uses an additive migration and records its own measured evidence before commit. H/I hosted, recovery-provider and venue gates remain open.

## Batch 1 — scoring recovery and continuation

Exact inventory: `src/domain/scoring.ts`, `src/features/scoring/scoreboard.tsx`, `tests/fixtures/scoring.json`, `tests/unit/scoring.test.ts`, `tests/e2e/scoring.spec.ts`, `supabase/tests/024_scoring_recovery.sql`, `supabase/migrations/202610180015_scoring_recovery.sql`, this report and `docs/IMPLEMENTATION_PLAN.md`.

Fix symmetric continuing-player reservations/rest checks, deciding-set end changes (including undo), and retention of uncertain command UUIDs after throttling or temporary loss of authentication/authority. Status: verified.

Before the fix, four unit cases failed on the fifth-point end change, the SQL regression demonstrated the missing B-side rest guard, and the browser regression observed the pending UUID disappear after HTTP 429. After migration 032: all 134 unit tests and 846 SQL assertions pass; 1,745 scoring transitions, 508 Elo vectors and four team outcomes match SQL/TypeScript; real match-start and score/correction concurrency checks pass; all four affected desktop/mobile scoring/correction scenarios pass. Typecheck, zero-warning lint, production build and diff checks pass. Browser scenarios verify no-store/private snapshots, unchanged table authority, visible error/retry states and mobile overflow. No public grants or staff credentials were added. Original migrations remain unchanged.

## Batch 2 — withdrawals and team-forfeit corrections

Add match-specific retirement without global player dropout and audited correction/reopening of team forfeits, preserving prior attempts and checking downstream play. Expand exact inventory before implementation. Status: pending.

## Batch 3 — public history and documentation

Keep historical public profiles available after roster exit/transfer/dropout using approved fields, independently of current ranking eligibility. Record the synchronous ranking/photo implementation as an explicit architecture decision and reconcile status claims. Expand exact inventory before implementation. Status: pending.
