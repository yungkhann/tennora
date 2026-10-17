# Implementation status

The user authorized sequential execution of [TABLE_TENNIS_IMPLEMENTATION_PLAN.md](TABLE_TENNIS_IMPLEMENTATION_PLAN.md). Confirmed: Next.js/Supabase, one league, coexisting staff roles. This file records actual status; proposed dates are in the detailed plan and are not completion claims. Original tennis Phase 1 roadmap is archived in archive/PHASE_1_IMPLEMENTATION_PLAN.md; its historical verification remains in VERIFICATION.md.

| Task                      | Status      | Next gate                                                                                       |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| A - Rebaseline            | Complete    | Verified revised PDF and requirement mapping; see MILESTONE_A_VERIFICATION.md                   |
| B - Staff foundation      | Complete    | Staff roles, Auth administration and session/permission proofs; see MILESTONE_B_VERIFICATION.md |
| C - Seasons/teams/players | In progress | C1/C2 verified; C3 photos/settings/stages/start readiness remain                                |
| D - Draws/lineups         | Not started | D03-D05 and replacement semantics                                                               |
| E - Scoring/Elo           | Not started | D06-D08; transactional, duplicate/concurrent and parity proofs                                  |
| F - Hall operations       | Not started | D09 venue/rest/finals/device policy                                                             |
| G - Public/locales/live   | Not started | Committed public-safe projections and recovery tests                                            |
| H - Readiness             | Not started | Provider/recovery feasibility and complete integration evidence                                 |
| I - Rehearsal/release     | Not started | All measured go-live gates pass; no silent integrity/privacy waivers                            |

## A: exact files and changes

No application or database migration changes in this batch. Rebaseline PRODUCT_SPEC.md, ARCHITECTURE.md, DATABASE.md, ROUTES.md and this ledger; update AGENTS.md and the detailed plan's approved role/status entries; add DECISIONS.md and REQUIREMENTS_REVISED.md. Preserve the five previous planning documents under docs/archive/PHASE_1_*.md. Add scripts/build-requirements-pdf.py, scripts/pdf-requirements.txt and output/pdf/Tennora_Table_Tennis_Requirements_Revised.pdf. Record verification in docs/MILESTONE_A_VERIFICATION.md. The user's original PDF remains untouched and untracked.

Pending domain decisions gate their dependent tasks, not already-settled architecture or independent implementation. D01 is resolved: coexisting roles. Consult DECISIONS.md before encoding D02-D10. Each implementation batch lists exact files/migrations, runs relevant checks, records evidence and gets one focused commit before proceeding.

## B: implemented batch

See MILESTONE_B_BATCH.md for scope and MILESTONE_B_VERIFICATION.md for measured evidence. Migrations 202610170002 and 202610170003 preserve legacy records while introducing staff roles, provisioning receipts and audited account/profile RPCs. Hosted rollout remains a later operational task.

## C: partial delivery

C1 seasons/tours and confirmed age eligibility are verified; see MILESTONE_C1_VERIFICATION.md. C2 clubs/players/rosters and scale fixture proof are verified in MILESTONE_C2_VERIFICATION.md. C3 photos/settings/stages and season-start readiness remain. C08 confirms Organizer-approved mid-season transfers and direct use of the active season roster. Season start remains explicitly blocked until full configuration readiness.
