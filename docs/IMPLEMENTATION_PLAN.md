# Implementation status

The user authorized sequential execution of [TABLE_TENNIS_IMPLEMENTATION_PLAN.md](TABLE_TENNIS_IMPLEMENTATION_PLAN.md). Confirmed: Next.js/Supabase, one league, coexisting staff roles. This file records actual status; proposed dates are in the detailed plan and are not completion claims. Original tennis Phase 1 roadmap is archived in archive/PHASE_1_IMPLEMENTATION_PLAN.md; its historical verification remains in VERIFICATION.md.

| Task                      | Status      | Next gate                                                                                       |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| A - Rebaseline            | Complete    | Verified revised PDF and requirement mapping; see MILESTONE_A_VERIFICATION.md                   |
| B - Staff foundation      | Complete    | Staff roles, Auth administration and session/permission proofs; see MILESTONE_B_VERIFICATION.md |
| C - Seasons/teams/players | Complete    | C1/C2/C3a/C3b verified; see milestone reports                                                   |
| D - Draws/lineups         | Complete    | D1/D2/D3a/D3b/D3c verified; see milestone reports                                               |
| E - Scoring/Elo           | Complete    | E1/E2/E3 corrections and continuation verified; see MILESTONE_E3B2_VERIFICATION.md              |
| F - Hall operations       | Not started | D09 venue/rest/finals/device policy                                                             |
| G - Public/locales/live   | Not started | Committed public-safe projections and recovery tests                                            |
| H - Readiness             | Not started | Provider/recovery feasibility and complete integration evidence                                 |
| I - Rehearsal/release     | Not started | All measured go-live gates pass; no silent integrity/privacy waivers                            |

## A: exact files and changes

No application or database migration changes in this batch. Rebaseline PRODUCT_SPEC.md, ARCHITECTURE.md, DATABASE.md, ROUTES.md and this ledger; update AGENTS.md and the detailed plan's approved role/status entries; add DECISIONS.md and REQUIREMENTS_REVISED.md. Preserve the five previous planning documents under docs/archive/PHASE_1_*.md. Add scripts/build-requirements-pdf.py, scripts/pdf-requirements.txt and output/pdf/Tennora_Table_Tennis_Requirements_Revised.pdf. Record verification in docs/MILESTONE_A_VERIFICATION.md. The user's original PDF remains untouched and untracked.

Pending domain decisions gate their dependent tasks, not already-settled architecture or independent implementation. D01 is resolved: coexisting roles. Consult DECISIONS.md before encoding D02-D10. Each implementation batch lists exact files/migrations, runs relevant checks, records evidence and gets one focused commit before proceeding.

## B: implemented batch

See MILESTONE_B_BATCH.md for scope and MILESTONE_B_VERIFICATION.md for measured evidence. Migrations 202610170002 and 202610170003 preserve legacy records while introducing staff roles, provisioning receipts and audited account/profile RPCs. Hosted rollout remains a later operational task.

## C: delivered

C1 seasons/tours and confirmed age eligibility are verified; see MILESTONE_C1_VERIFICATION.md. C2 clubs/players/rosters and scale fixture proof are verified in MILESTONE_C2_VERIFICATION.md. C3a private photos/consent and Organizer publication/revocation are verified in MILESTONE_C3A_VERIFICATION.md. C3b versioned settings, reusable stage templates and season-start readiness are verified in MILESTONE_C3B_VERIFICATION.md. C08 confirms Organizer-approved mid-season transfers and direct use of the active season roster. Season start enforces configuration readiness and records an immutable settings/stage-plan snapshot. Draw generation remains Task D.

The explicitly requested first Organizer was provisioned via a normal email-verification/password-setup invitation; see MILESTONE_B_INVITATION_VERIFICATION.md. Local delivery uses Mailpit. No preset password or automatic legacy-owner promotion is used.

## D: delivered

See MILESTONE_D_BATCH.md for the exact D1 draw/seed/match-graph inventory. C15–C18 settle seeding, classification, group ties and the snake/crossover map. D1 is verified in MILESTONE_D1_VERIFICATION.md. C19/C20 resolve replacements before singles start and both-team unresolved matches. D2 lineup submission/reveal/replacements is verified in MILESTONE_D2_VERIFICATION.md. D3a standings/source advancement is verified in MILESTONE_D3A_VERIFICATION.md. D3b standalone knockout generation is verified in MILESTONE_D3B_VERIFICATION.md. D3c Organizer seed adjustments are verified in MILESTONE_D3C_VERIFICATION.md. Task D is complete; transactional scoring/Elo and completed-result corrections are E. C25 delegates remaining choices from the PDF without further questions.

## E: in progress

E1 private scoring/Elo rules and TypeScript/PostgreSQL parity are verified in MILESTONE_E1_VERIFICATION.md. E2 authoritative score/event/result/Elo transactions and judge controls, then E3 completed-result corrections/dependency resolution/replay remain. Task E is not complete until those integration gates pass. See MILESTONE_E_BATCH.md for exact inventory and preconditions.

E2a match-day authority and numeric storage prerequisites are verified in MILESTONE_E2A_VERIFICATION.md. E2b live-match leases and atomic scoring/result/Elo writes, E2c judge transport/UI and E3 corrections remain before Task E is complete.

E2b1 live lifecycle/resource leases and transfer-safe lineups are verified in MILESTONE_E2B1_VERIFICATION.md. E2b2 point/result/Elo transactions and E2c judge transport/UI remain; E3 corrections/replay and the full F allocator still follow.

E2b2 atomic score/event/result/Elo transactions are implemented; verification is recorded in MILESTONE_E2B2_VERIFICATION.md. E2c judge HTTP/UI and E3 completed-result correction/replay remain before Task E is complete. Hall allocation and public projections remain F/G.

E2c private judge discovery, validated HTTPS command/snapshot transport and RU/KK/EN tablet controls are implemented; see MILESTONE_E2C_VERIFICATION.md for verification. E3 official corrections/dependency resolution/saved-K replay remain before Task E is complete. Full hall operations, public live/rankings and operational release gates still follow in order.

E3a rating anchors, linked-history integrity and private chronological saved-K replay are implemented; see MILESTONE_E3A_VERIFICATION.md. Official result amendment/reopen, dependent-match resolution and correction controls remain E3b before Task E is complete.

E3b1 immutable correction proposals and deterministic team/qualifier/dependency preview are verified; see MILESTONE_E3B1_VERIFICATION.md (726 database assertions, 125 unit tests, 30 responsive browser scenarios, Auth, parity/concurrency and production build pass). The current official result remains unchanged during review. E3b2 atomic application, dependency resolution, continuation and official UI are the next batch before Task E is complete.

E3b2 atomic correction application, preserved dependent attempts, saved-K replay and continuation are verified in MILESTONE_E3B2_VERIFICATION.md. Task E is complete. Next is F: full hall allocation, start-all, ownership/override and continuation controls. Production deployment/load/recovery acceptance remains H/I.
