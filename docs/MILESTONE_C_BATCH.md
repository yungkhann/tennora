# Task C batch inventory and gates

Task B committed as `f1ca47f`. C07 confirms age on December 31 of the season year, U13 under 13 / U15 13–14 / U17 15–16, no playing up and max ten active players per club's age-group roster.

Implement C in reviewable batches, each with its own verified commit. C remains in progress until all C deliverables pass.

## C1 — seasons and tours

Files: `supabase/migrations/202610170004_seasons_tours.sql`, `supabase/tests/003_seasons.sql`, regenerated database types, `src/features/seasons/{validation,actions,forms}.ts*`, `src/app/[locale]/(staff)/organizer/seasons/page.tsx`, `src/domain/eligibility.ts`, `tests/unit/eligibility.test.ts`, `tests/e2e/seasons.spec.ts`, locale dictionary, staff navigation/workspace, proxy matcher, implementation/verification docs.

Organizer creates/edits seasons and ordered tours. Year is the explicit eligibility reference, independent of dates; age uses birth year only. Validate date bounds, unique ordinals, at least one tour before start, and lock both season/tour configuration after start. No delete UI. Main Judge/Trainer/Line Judge cannot mutate season configuration through direct RPCs. Preserve actor/before/after audit. Season start is explicitly unavailable until C3 adds required stage/settings readiness. Do not present tournament operation/scoring as implemented.

## C2 — clubs, players, rosters and trainer scope

Planned files: `202610170005_teams_players.sql`, `src/features/{teams,players}/`, team/subteam routes, trainer assignments, player/status/rating provenance records, related SQL/browser/concurrency fixtures. Expand exact inventory before editing. Team registration and roster history are season-scoped. Eligibility/capacity checks remain authoritative in SQL with shared TypeScript examples. No player Auth account. Main Judge may manage all teams; trainer authority remains in one assigned parent club. C08 now permits Organizer-approved mid-season transfers with history and uses the active season roster directly; no separate tournament roster is required.

## C3 — photos/consent, settings/stage configuration and scale proof

Expand inventory before editing. Private object storage/consent, controlled approved photo delivery/revocation, versioned settings and pre-season stage configuration; 24 clubs/72 subteams/360+ synthetic players. No real minors' data or consent evidence is introduced by fixture testing. D06/D09/D10 gate affected defaults/operational policy; do not invent them.

C1 is implemented and verified in MILESTONE_C1_VERIFICATION.md. C2 and C3 remain pending.
