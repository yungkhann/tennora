# D2 — locked lineups, private joint reveal and replacements

18 October 2026. Part of Task D; official standings/advancement and scoring remain subsequent batches.

## Delivered

Migrations 015–017 add ordered lineup receipts, gendered slots, singles games, replacement history and match/lineup/reveal versions. Localized Matches pages support assigned Trainers and Organizer/Main Judge oversight. Submission requires the active Trainer role and an explicit coached-subteam link; an official role alone does not permit submitting either side. SQL independently validates five distinct active eligible season-roster players in boy/girl/boy/girl/boy order, then locks that side. Exact retries preserve the original request and cannot change a submitted lineup.

A match row lock serializes both submissions. The second creates all five singles and stamps one joint reveal/audit atomically. Before that commit, policies hide selected players from opponents and officials, including a Trainer/Main Judge combined account. The general submission audit contains no selected-player identities or brute-forceable request hash; no singles-player rows exist yet. After reveal, captured lineup names are available without loosening private opposing player/DOB policies.

Organizer/Main Judge replacements require joint reveal, a pending singles, an eligible unused same-gender roster player, a reason and the current lineup version. Slot/game/history/audit and match/lineup versions update together. Started singles reject new replacements. Original submission and prior identities remain; committed receipt retries are accepted even after match completion. Match starts, withdrawal/forfeit results and Elo are E.

A private no-store endpoint returns flags/version only. Visible tabs poll every three seconds, back off on failures, pause while hidden and refresh the authorized server view after a lineup change. No Auth token is exposed to browser code. A narrow authorized club-name projection supplies opposing match labels; it grants no private club/player reads.

## Evidence

- Typecheck, zero-warning lint, 86 unit tests, production build and formatting/diff checks pass.
- All 371 pgTAP assertions pass on the existing local database and a separate project recreated from empty volumes with all seventeen migrations. The original database/accounts were preserved; the temporary project was stopped after testing.
- Twenty desktop/mobile browser cases plus the separate real Auth/invitation/session case pass. The lineup scenario submits through two real Trainer sessions, proves the Main Judge and opposing combined-role account cannot read the first side, probes direct REST/header/slot access and the no-store status payload, then verifies automatic joint reveal without a manual refresh. It replaces a pending player as Main Judge, checks the Trainer receives the update and verifies original receipt/game/history consistency.
- Direct SQL tests cover incomplete/duplicate/wrong-gender/foreign rosters, locked edits, changed request IDs, dual-role secrecy, pre-reveal replacement-oracle denial, joint versions, pending-only replacements, terminal-state retries, inactive tokens, anonymous denial and private status/name scope. Assertions are scoped to disposable fixtures so existing league records may remain.
- `npm run test:lineup-concurrency`: real submissions overlap about 1.96 seconds; both commit, with two lineups, exactly five singles, one reveal and unchanged duplicate receipt/version. Randomized Auth/club/player fixtures are removed afterward.
- Hidden-official and revealed/replacement desktop/mobile screenshots were visually inspected; no selected identities appear in the hidden view, and controls/history remain readable with no horizontal overflow. Browser fixture cleanup removes all dependent lineup/game/history rows and coach links, preserving the real Organizer account.

## Corrections and limits

Migration 016 moves exact replacement receipt handling before terminal-state rejection; new mutations still require an active match. Browser tests caught an opposing-club label lookup through private RLS; migration 017 provides only authorized match club labels instead of widening those policies. Visual review caught replacement selects automatically falling back to the old player after save; the select now resets with each lineup revision and requires an explicit new choice.

The concurrency script reuses the SQL suite’s marked setup boundary with randomized identities/emails; it runs separately from same-database browser/SQL fixtures. This is local integration evidence. Hosted polling latency, venue tablet behavior and broader event-day load remain H/I. No official score/result/standings, completed-match undo, table/day scoring assignment or public-site delivery is implied by this batch.
