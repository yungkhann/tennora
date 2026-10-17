# Task E batch inventory and gates

Task D is complete in `8e8de34`. C10/C12/C13/C19/C20/C22–C24 and delegated decisions govern scoring; C25 authorizes remaining choices without questions.

## E1 — shared scoring and Elo transitions

Exact planned files: `src/domain/scoring.ts`, `src/domain/elo.ts`, `tests/unit/scoring.test.ts`, `tests/unit/elo.test.ts`, `tests/fixtures/scoring.json`, `supabase/migrations/202610180004_scoring_rules.sql`, `supabase/tests/012_scoring_rules.sql`, `scripts/test-scoring-parity.mjs` and package script, regenerated types and milestone/decision/database/status docs.

Implement pure TypeScript and private PostgreSQL rule helpers with shared vectors and generated transition parity. Sets reach 11 with a two-point margin and no deuce cap; singles end at three sets. First server alternates between sets from the initial judge choice, then every two points/every point after 10:10. Derive serve/end indicators from score history. A trusted undo-point transition removes the actual latest active point, including the just-completed set; the future RPC obtains that side from its log rather than accepting client score claims. Undo-set clears the current nonempty set, or the previous completed set when the current set is empty. Preserve timeout usage across undo; one timeout per player per singles. Private pure helpers grant no staff mutation/scoring bypass.

Whole-number Elo uses the confirmed 400-point formula, rounds each new individual rating and floors at zero. Automatic losses leave both ratings unchanged. Test saved-K inputs and numerical edge cases. No result/history write or judge authority is claimed in E1.

E2 introduces authoritative event/receipt/set/result/Elo transactions, actual table/day scoring scope, starts/withdrawal/forfeit handling and private snapshot/HTTP/UI integration. E3 supplies complete-result correction, dependency resolution, replay using original K and audit history. E remains in progress until all contracts, duplicate/race/parity/direct-API/privacy and responsive judge checks pass; F adds the full hall allocator/start-all/override workflow.

E1 integration preconditions for E2: align provisional rating-history/player upper bounds with the confirmed formula, preserve nonnegative/finite/whole results, validate K precision at configuration time, and enforce undo target/finished-result authority in the public command rather than trusting the pure helper input. Timeout deadlines and table/day ownership remain E2 transaction checks.

E1 is verified in MILESTONE_E1_VERIFICATION.md. No live scoring endpoint or rating-history write is implied by the private rule layer.
