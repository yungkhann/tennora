# C1 — seasons, tours and eligibility foundation

17 October 2026. Part of Task C; Task C is not complete.

Implemented migration `202610170004_seasons_tours.sql`: Organizer-only season/tour create/edit RPCs with caller identity, before/after audit, explicit season reference year, validated date bounds, unique tour order and immutable configuration once a season is started. Direct writes are revoked; draft base tables are unavailable anonymously and to inactive staff. All configuration mutations lock/recheck through the administration boundary and parent season row.

Added localized Organizer season/tournament forms and navigation, input contracts and pure TypeScript age eligibility matching SQL boundaries. Age uses season year minus birth year; U13 under 13, U15 13–14, U17 15–16, no playing up. Roster assignment will enforce this helper in C2.

Checks: 54 unit contracts, 115 pgTAP assertions, typecheck, zero-warning lint and production build pass. Ten desktop/mobile browser cases pass, including real Organizer season/tour creation and editing, audit attribution, Main Judge directory denial and a trusted fixture's started-season read-only state. Browser fixtures clean up. Successful create forms disable repeat submission and offer an explicit form refresh before creating another record. Age boundary tests cover 12/13/14/15/16/17 and future/missing years. Date/ordinal conflicts, cross-season tour moves, direct write bypasses and locked updates are denied by SQL. Existing local database was migrated additively without reset. Full fresh-schema proof will be repeated with the completed C migrations.

Season start is intentionally unavailable: its RPC refuses until stage/settings readiness exists in C3, and the page explains that state. This prevents locking an incomplete real season. No tournament execution, draw, roster, photo, setting or scoring functionality is claimed by C1. No pending K/rest/finals policy is assigned an invented default.
