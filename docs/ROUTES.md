# Routes

## Current implementation

Task B implements localized `/[locale]/login`, `/forgot-password`, `/reset-password`, `/workspace`, `/organizer/staff` and `/settings/profile` for ru/kk/en. C1 adds `/organizer/seasons`; C2 adds `/team`, `/team/[teamId]` and `/subteam/[subteamId]` with private scope checks. Callbacks remain unlocalized. Old auth/workspace bookmarks redirect to Russian equivalents; signup redirects to staff login. Organization onboarding is retired. `/` and `/live` retain transitional public pages until G. Historical routes: archive/PHASE_1_ROUTES.md.

## Target public routes (milestone G)

All public routes have `/[locale]` with `ru`, `kk`, `en`; `/` redirects to `/ru`. Russian is default/fallback. A tournament is a tour in the model.

| Route beneath /[locale]              | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| /                                    | Live/called matches, league standings, individual ranking summary |
| /ranking                             | Individual rankings/filter/search                                 |
| /player/[playerId]                   | Public-safe profile, best wins, rating graph and match history    |
| /seasons                             | Season cards                                                      |
| /season/[seasonId]                   | Tours, teams and standings                                        |
| /tournament/[tourId]                 | Detailed tour information                                         |
| /tournament/[tourId]/matches         | Public schedule and results                                       |
| /tournament/[tourId]/match/[matchId] | Public match detail                                               |
| /tournament/[tourId]/draws/[drawId]  | Published groups/brackets                                         |
| /live                                | League live match center                                          |
| /live/[matchId]                      | Authoritative live scoreboard                                     |
| /scoreboard                          | Large-format hall display                                         |

Public responses contain no draft/hidden lineups, private DOB, trainer contacts or unconsented photos. Public pages never need a staff session.

## Target staff routes (milestones B-F)

| Localized route                         | Required permission                                                       |
| --------------------------------------- | ------------------------------------------------------------------------- |
| /login, /forgot-password                | Public; recovery is enumeration-safe                                      |
| /reset-password                         | Verified recovery/account session; can activate pending provisioned staff |
| /workspace                              | Active staff landing page                                                 |
| /organizer/staff                        | Organizer account/role/provisioning controls                              |
| /organizer/seasons, /organizer/settings | Organizer only                                                            |
| /hall                                   | Organizer/Main Judge operations                                           |
| /team                                   | Assigned teams for Trainer; all teams for Organizer/Main Judge            |
| /team/[teamId]                          | Authorized club management                                                |
| /subteam/[subteamId]                    | Authorized roster management                                              |
| /subteam/[subteamId]/tour/[tourId]      | Active season roster (no separate submission)                             |
| /matches/[matchId]/lineup               | Own-team Trainer lineup submission                                        |
| /matches/[matchId]/manage               | Organizer/Main Judge oversight                                            |
| /linear-judge                           | Active Line Judge with venue-date/table assignment                        |
| /settings/profile                       | Self profile; not role editing                                            |

Auth callbacks stay unlocalized `/auth/confirm` and `/auth/callback`. They accept only fixed token types and known local destinations. Auth routes and old bookmarks redirect safely to their localized equivalents; public signup is removed and provider signup disabled in B. Reset/activation must function before active staff access; ordinary private access requires active provisioning.

## Server endpoints and compatibility

Scoring uses POST `/api/scoring` with origin check, schema validation, verified identity and database command authorization. Private snapshot/status endpoints are no-store and reauthorize each call. Public snapshot endpoints return published safe projections and support five-second fallback polling. Exact endpoint files/contracts are finalized before their milestone.

Changing locales must not bypass proxy refresh, staff authorization or resource checks. UUID validation and indistinguishable not-found responses protect private resource existence. Canonical new routes do not require deleting legacy data. Retire `/register` and organization creation at B's onboarding switch; remove old organization navigation after the new staff landing is verified.

## Photo endpoints (C3a)

`GET /api/public/player-photo/[playerId]` reads only an approved sanitized JPEG projection using an anonymous client. Pending/revoked/unknown images return 404; responses are no-store. `GET /api/staff/photos/[assetId]` reauthorizes the private original on every request; `?kind=evidence` additionally requires the uploader or Organizer and downloads as an attachment. Private responses are no-store and never expose a Storage URL. Publication/revocation uses Organizer-only Server Actions plus independently authorized RPCs.
