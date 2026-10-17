# Decisions and requirement changes

Recorded 17 October 2026. Confirmed means explicitly chosen by the user or unambiguous in the source requirements. Pending means dependent implementation must wait for an answer, or a clearly documented proposal accepted in a later instruction.

## Confirmed

| ID  | Decision                                                                                         | Evidence                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| C01 | Keep Next.js and Supabase; revise the PDF's architecture prescriptions.                          | User architecture answer in this conversation.                                                                                     |
| C02 | One league; clubs/subteams are not independent tenants.                                          | User scope answer in this conversation.                                                                                            |
| C03 | Execute implementation plan tasks sequentially with verification and a focused commit per batch. | User instruction to implement tasks one by one.                                                                                    |
| C04 | No player accounts, payments, native apps or first-release CSV importer.                         | Source PDF sections 1/3; FR-18 schema remains in scope.                                                                            |
| C06 | Staff roles may coexist on one account; e.g. Trainer and Line Judge.                             | User role-model answer in this conversation; resolves D01.                                                                         |
| C05 | RU/KK/EN UI; Russian default/fallback.                                                           | FR-17 includes all three; source NFR supplies default/fallback. Include stronger language requirement instead of dropping English. |

| C07 | Age is measured on December 31 of the season year: U13 under 13, U15 ages 13–14, U17 ages 15–16. No playing up. Maximum 10 active players per club/age-group roster. | User confirmed both age-group answers in this conversation. |

| C08 | Organizer-approved mid-season transfers are allowed and preserve earlier results. Tournaments use the active season roster directly; no separate tour-roster submission. | User answers in this conversation; resolves transfer/tour-roster part of D02. |

| C09 | Trainers upload player photos and written guardian-consent evidence; Organizer approves publication. | User photo-workflow answer in this conversation. |
| C10 | Standard 400-point Elo; round each result to a whole rating; minimum zero. | User rating-policy answer in this conversation. |

| C11 | Each age group’s 24 clubs use four groups of six, then three eight-team knockout brackets. Group places 1–2 enter the top bracket, 3–4 the middle, and 5–6 the lower. | User tournament-format answer in this conversation. Bracket seeding, placement matches and tie-breaks remain D04. |
| C12 | A team needs all three boys and two girls to start a match; inability to field them causes a team forfeit. Later withdrawals lose their singles. | User lineup answer in this conversation. Replacement and both-team/no-show details remain D03/D08. |

## Pending rules and dependencies

| ID  | Decision needed                                                                                                                                         | Dependency / next action                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| D02 | Minimum competition roster only; age/capacity resolved by C07 and transfers/tour-roster behavior by C08.                                                | C player eligibility. No DOB boundary is invented.                                              |
| D03 | Both sides unable to start and no-show details. Starting lineup and withdrawals resolved by C12.                                                        | D/E submissions and automatic results.                                                          |
| D04 | Bracket seed maps, placement/third-place matches, seed ties and group/multi-way/head-to-head tie-breaks. Sizes and qualification bands resolved by C11. | D draws/standings.                                                                              |
| D05 | Seeding input/freeze: top five eligible players, 3 boys and 2 girls, as proposed?                                                                       | D seed snapshots.                                                                               |
| D06 | K scope/effective time, weighted placements/missing-tour policy. Formula/whole-rating rounding/minimum zero resolved by C10.                            | E rating and G season standing calculations. Initial 1000/no auto-loss Elo remain source rules. |
| D07 | Who may reopen completed games/matches, cascading corrections to Elo, subsequent games and advanced draws; history revision model.                      | E correction migrations and tests. Do not silently restrict required undo.                      |
| D08 | Mid-game replacement score/Elo attribution; timeout limits; first server across sets; judge fallback.                                                   | D replacements and E/F judge controls.                                                          |
| D09 | Rest minutes/finals priority/override policy, venue timezone, devices/network and simulated table count.                                                | F scheduling and I acceptance. No player/table simultaneous conflicts.                          |
| D10 | Hosting region, photo consent/evidence process, service budget/recovery capabilities and alert recipients.                                              | Real data and H/I deployment.                                                                   |

No pending item authorizes an invented value. Continue work that is independent of it. Before a dependent milestone, ask the smallest necessary question and keep the affected task pending while completing independent work.

## Architecture changes to record in the revised PDF

Use Next.js HTTP commands plus transactional Supabase RPC; Supabase public Realtime and private staff polling replace Channels groups. Hosted service/PITR plus off-site and Storage backups replace VPS-specific scripts. Supabase-managed password security replaces the unverified Argon2 prescription. Preserve business FR IDs, atomicity/privacy and measured go-live targets. HTTP-only server-mediated staff sessions must be proved in B; do not call the default browser cookie setup compliant.
