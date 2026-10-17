# D3a — group standings, tie receipts and source-driven advancement

18 October 2026. Part of Task D. Standalone seeded knockout generation and Organizer pre-publication seed adjustments remain D3b/D3c; native scoring/corrections remain E.

## Delivered

Migration 018 introduces immutable result revisions, current result pointers with match/revision integrity validation, standings snapshots/heads, exact-subset random tie receipts and current tour placements. Staff have no result-write RPC or direct mutation grant; E will derive totals from authoritative singles and invoke advancement inside the scoring transaction. Synthetic trusted fixtures do not imply live score entry is implemented.

Standings follow C17: overall wins, tied-club mini-table wins, singles/set/point ratios, then recalculation for each remaining subset. Numeric cross-products avoid floating-point ratio decisions. Exact unresolved subsets require an Organizer draw after every group match finishes. Each club receives a stored UUID lot; one immutable receipt and audit record the outcome. Main Judges may refresh but cannot draw final ties. Preflight dependency locks before generating randomness; retries return the finalized snapshot without drawing again.

Snapshots preserve source match/status/result IDs, totals, unresolved subsets, mini-table evidence and used tie receipts. Unchanged refreshes return the same snapshot. Incomplete/unresolved groups advance nobody. Explicit group-place and match winner/loser sources populate bracket sides and retain the supplying snapshot/result ID. Classification finals write all places 1–24 with bracket offsets. A changed qualifier cannot overwrite a locked/started/completed dependent match; the attempted snapshot/advance rolls back atomically. E implements the authorized correction-resolution workflow.

A source-readiness helper independently checks parent completion, current source versions and participant identity. New lineup submissions acquire the draw coordination lock before match locks and reject stale sources after exact receipt handling. The safe private status payload adds only `sources_ready`; the page disables submissions when false. E/F must take the same draw lock before match/player locks, without league administration locks per point.

Localized staff draw pages show real empty/provisional/complete/unresolved standings and tie evidence. Organizer-only controls confirm the final random draw and carry the expected revision. Advanced bracket sides display actual club names. Every action uses the verified staff user's client and independently authorized RPC.

## Evidence

- Typecheck, zero-warning lint, 94 unit tests, production build, formatting and diff checks pass.
- All 400 pgTAP assertions pass on the original local project and a separate project recreated from empty volumes with all eighteen migrations. The temporary project was stopped afterward; original data/accounts were preserved.
- Six shared TypeScript/PostgreSQL fixtures match the complete order, metrics, unresolved subsets and evidence exactly. Cases include a circular tie, final lot, point ratio and a partial tie requiring mini-table recalculation. Unit checks include exact close ratios, neutral empty ratios, infinity and duplicate-lot rejection.
- SQL fixtures complete all group and classification matches, verify twelve populated quarterfinals, all 24 distinct placements, stale-source lineup rejection, mismatched-result-pointer rejection and rollback when an upstream change would rewrite a completed descendant. Direct staff/history mutation, Trainer refresh, Main Judge lot and anonymous access are denied.
- `npm run test:standings-concurrency`: requests overlap 1,982 ms; both return successfully with exactly one tie receipt, one final snapshot and one audit. Disposable UUID-scoped fixture records are removed afterward.
- `npm run test:lineup-concurrency` passes after source-lock integration: submissions overlap 1,952 ms, create exactly five singles and one reveal, and preserve duplicate receipts.
- All 22 desktop/mobile browser cases pass. Final affected standings cases and the separate real Auth/invitation/session case pass after the last display refinement. Standings browser coverage checks explicit provisional state, withheld advancement, Main Judge denial, Organizer confirmation, finalized evidence, retained retry receipt and no horizontal overflow. Desktop/mobile screenshots were visually inspected.

## Limits and corrections

SQL fixture execution exposed a parameter/column ambiguity in the tie RPC and a fixture record alias collision; both were corrected before final verification. Tie evidence now displays the actual lot order rather than merely listing the tied membership. No points, Elo or fictional played events are produced by standings refresh. Hosted event-day latency, public projections and production recovery remain later gates. The original source PDF's SHA-256 remains `ec19b24fe3906f83486735726c3ffc19e137e7f11b0b11fedb609266da62cf68`.
