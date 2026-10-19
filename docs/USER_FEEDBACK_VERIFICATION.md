# User feedback verification — 19 October 2026

Status: implementation and local verification complete. This is the targeted C26 feedback batch, not a production release or completion of H/I external gates.

## Delivered behavior

Age eligibility now uses the existing December 31 season-year classifier as an upper bound: U13 → U13/U15/U17, U15 → U15/U17, U17 → U17. The TypeScript helper drives roster/lineup choices. SQL independently checks roster assignment, player DOB edits, season-year edits, draw seeds, lineup submission/replacement and subsequent lifecycle eligibility. A scoped “Player exceeds lineup age limit” error has RU/KK/EN UI copy. One active roster per player/season, capacity ten, active club membership, gendered/distinct slots, hidden-lineup secrecy, versions, rest and exclusive resources remain enforced.

All mandatory administrative reason inputs are replaced by the unchecked “Подтверждаю действие” checkbox, with KK/EN equivalents. Covered workflows: roster exit, dropout, Organizer transfer, locked replacement, draft seed swap, photo approval/rejection/revocation, bulk hall allocation/start, manual table assignment/release/call/start/resume, table-judge assignment/release/takeover, singles/team correction proposals and reviewed application, and singles retirement. Existing action summaries, correction previews and additional Organizer consent for started dependencies remain. Shared forms disable the final action until checked; details/dialog close/open and completed responses clear confirmation. Retirement has the same checked-state gate. No description, consent-evidence or unrelated business input was removed.

Fourteen boolean administrative RPC signatures and the scoring confirmation signature reject absent/false/null confirmation where applicable. Old textual signatures are inaccessible to PUBLIC/anon/authenticated and remain only for server-internal lifecycle transactions. Existing authorization, actor derivation, receipt/version behavior and transactional audits remain in those original transactions. New audit/history rows store a trusted `Action confirmed` marker; staff screens localize that marker. Existing explanation text, actors and timestamps are retained without rewriting history.

Personal rankings have Boys/Girls segmented links sourced from `players.gender`, independently numbered with the unchanged rating-descending/last-name/ID ordering. Age/search/page controls retain gender; switching groups resets page. Existing published roster-category age filtering is preserved. Approved public players are read in stable pages rather than a globally capped first 1,000 rows. The anonymous projection adds only the defined gender field; current/historical profiles contain nine approved fields, never DOB or private staff metadata. A burst of Realtime result rows exposed a navigation race, so public directory refresh now coalesces a burst and discards a queued refresh when its URL has changed. Scoring snapshots/authority/formula are unchanged.

## Database and authorization review

- Additive migration: `supabase/migrations/202610190001_user_feedback.sql` (035); applied to the existing local Supabase database without resetting data.
- All 35 migrations also replayed on empty application schemas in a temporary isolated database with the Supabase provider baseline retained; all SQL suites passed there. Temporary database removed afterward.
- Existing RLS, table grants, user-JWT clients and trusted `auth.uid()` actor derivation remain. Definer confirmation wrappers have an empty search path. Legacy organization ownership still grants no league authority; players gain no Auth account.
- SQL tests exercise the complete matrix under Organizer, Main Judge and Trainer identities, younger draw seeding/submission/replacement, older rejection, false/null confirmation, legacy-signature denial, audit actor/timestamp preservation, all new RPC grants and both public genders without missing/duplicate fixture participants.
- Existing permission, atomic rollback, result/Elo history, physical rest, transfer, hidden-reveal and idempotency tests now invoke the boolean APIs. Tests that previously varied only removed reason text now vary another immutable payload field.

## Verification

| Check                                       | Result                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                         | Passed                                                                                                                                     |
| `npm run lint`                              | Passed                                                                                                                                     |
| `npm test`                                  | 162 tests / 15 files passed                                                                                                                |
| `npx supabase test db`                      | 1,011 assertions / 29 SQL files passed                                                                                                     |
| Isolated clean application-schema replay    | All 35 migrations and every SQL suite passed                                                                                               |
| `npm run test:scoring-parity`               | 1,745 score transitions, 508 Elo vectors and four team outcomes match TypeScript/SQL                                                       |
| `npm run test:standings-parity`             | All six shared fixtures match                                                                                                              |
| Relevant real concurrency scripts           | All eight passed: roster, lineup, draw publish/regenerate, seed adjustment/publish, table owner, match start, score/correction, hall batch |
| Repeated ranking browser regression         | Six passes (three desktop + three mobile) after refresh coalescing                                                                         |
| `npm run test:e2e -- --workers=1`           | 46 passed (desktop Chromium + mobile Chromium; one worker, isolated output directory)                                                      |
| `npm run test:auth`                         | One end-to-end Auth/provisioning/reset/permission scenario passed (isolated output directory)                                              |
| `npm run build`                             | Final production build passed                                                                                                              |
| `npm run test:browser-secrets`              | No server Auth secrets or private administration references in browser artifacts                                                           |
| `npm run format:check` / `git diff --check` | Passed                                                                                                                                     |

The browser tests use disposable local database fixtures, with no mock data in production paths. They cover U13 players in U15 roster/lineup/replacement choices, older-player exclusion and direct rejection, checkbox default/disabled/checked/reset behavior, gender-specific first/second pages, all age/search combinations, history/audit preservation and desktop/mobile overflow checks. Desktop and mobile ranking screenshots were visually reviewed; existing typography, table and responsive controls remain intact. Early browser runs caught obsolete reason-history assertions, strict selectors matching Next's hidden retained pages, an incorrect new test RPC argument, and the Realtime navigation race; these were corrected. One overlapping Auth/browser invocation shared Playwright artifacts and caused an ENOENT harness error; final runs use separate output directories sequentially. An early parallel mobile Realtime deadline was rechecked in the final isolated suite.

`npm run test:hall-scale` also passed: 72 subteams / 360 players, three published composite draws, 288 queue nodes, 180 jointly revealed group lineups and twelve conflict-free allocations through authenticated RPCs; the fixture transaction was rolled back.

The final typecheck/lint/unit/build pipeline, browser-secret scan and repository formatting check all passed. No remaining test failures are reported for this batch.

## Remaining boundaries

The migration is applied and verified locally; hosted rollout must apply migration 035 alongside the application update. No hosted deployment was requested or performed. Existing one-active-roster-per-season and published roster-category age filters intentionally remain. Earlier user explanations remain readable; new administrative actions require confirmation only. Elo formulas, tie order, privacy boundaries and existing H/I external provider/venue/recovery release gates are unchanged.

## Exact file inventory

### Application and localization

- `src/app/[locale]/(public)/ranking/page.tsx`
- `src/app/[locale]/(staff)/corrections/[requestId]/page.tsx`
- `src/app/[locale]/(staff)/draws/[tourId]/[ageGroup]/page.tsx`
- `src/app/[locale]/(staff)/matches/[matchId]/corrections/page.tsx`
- `src/app/[locale]/(staff)/matches/[matchId]/lineup/page.tsx`
- `src/app/[locale]/(staff)/subteam/[subteamId]/page.tsx`
- `src/app/[locale]/(staff)/team/[teamId]/page.tsx`
- `src/components/mutation-form.tsx`
- `src/domain/eligibility.ts`
- `src/domain/rankings.ts`
- `src/features/corrections/actions.ts`
- `src/features/corrections/forms.tsx`
- `src/features/corrections/messages.ts`
- `src/features/corrections/validation.ts`
- `src/features/draws/actions.ts`
- `src/features/draws/forms.tsx`
- `src/features/draws/validation.ts`
- `src/features/hall/actions.ts`
- `src/features/hall/forms.tsx`
- `src/features/hall/messages.ts`
- `src/features/hall/validation.ts`
- `src/features/lineups/actions.ts`
- `src/features/lineups/forms.tsx`
- `src/features/lineups/validation.ts`
- `src/features/photos/actions.ts`
- `src/features/photos/forms.tsx`
- `src/features/photos/validation.ts`
- `src/features/players/actions.ts`
- `src/features/players/forms.tsx`
- `src/features/players/validation.ts`
- `src/features/public/data.ts`
- `src/features/public/messages.ts`
- `src/features/public/refresh.tsx`
- `src/features/public/validation.ts`
- `src/features/scoring/messages.ts`
- `src/features/scoring/scoreboard.tsx`
- `src/features/scoring/validation.ts`
- `src/lib/locales.ts`
- `src/lib/supabase/database.types.ts`

### Database migration and SQL regressions

- `supabase/migrations/202610190001_user_feedback.sql`
- `supabase/tests/004_teams_players.sql`
- `supabase/tests/005_photos.sql`
- `supabase/tests/008_lineups.sql`
- `supabase/tests/011_draw_adjustments.sql`
- `supabase/tests/013_match_day_authority.sql`
- `supabase/tests/014_match_lifecycle.sql`
- `supabase/tests/015_scoring_transactions.sql`
- `supabase/tests/017_rating_replay.sql`
- `supabase/tests/018_correction_review.sql`
- `supabase/tests/019_correction_apply.sql`
- `supabase/tests/020_hall_operations.sql`
- `supabase/tests/021_public_league.sql`
- `supabase/tests/022_season_public_standings.sql`
- `supabase/tests/024_scoring_recovery.sql`
- `supabase/tests/025_team_forfeit_corrections.sql`
- `supabase/tests/026_singles_retirement.sql`
- `supabase/tests/027_seeded_forfeit.sql`
- `supabase/tests/028_historical_player_profiles.sql`
- `supabase/tests/029_user_feedback.sql`

### Browser and unit regressions

- `tests/e2e/corrections.spec.ts`
- `tests/e2e/draw-adjustments.spec.ts`
- `tests/e2e/hall.spec.ts`
- `tests/e2e/helpers/draw-fixture.ts`
- `tests/e2e/lineup-transfers.spec.ts`
- `tests/e2e/lineups.spec.ts`
- `tests/e2e/photos.spec.ts`
- `tests/e2e/public-live.spec.ts`
- `tests/e2e/rankings.spec.ts`
- `tests/e2e/scoring.spec.ts`
- `tests/e2e/teams.spec.ts`
- `tests/unit/confirmations.test.ts`
- `tests/unit/eligibility.test.ts`
- `tests/unit/players.test.ts`
- `tests/unit/rankings.test.ts`
- `tests/unit/scoring.test.ts`

### Integration clients for the confirmed RPCs

- `scripts/test-draw-adjustment-concurrency.mjs`
- `scripts/test-hall-concurrency.mjs`
- `scripts/test-hall-scale.mjs`
- `scripts/test-load-local.mjs`
- `scripts/test-match-start-concurrency.mjs`
- `scripts/test-score-concurrency.mjs`
- `scripts/test-table-owner-concurrency.mjs`

### Requirements, decisions and verification ledger

- `docs/DATABASE.md`
- `docs/DECISIONS.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PRODUCT_SPEC.md`
- `docs/REQUIREMENTS_REVISED.md`
- `docs/ROUTES.md`
- `docs/USER_FEEDBACK_VERIFICATION.md`
