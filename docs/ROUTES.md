# Routes

## Current implementation

Task B implements localized `/[locale]/login`, `/forgot-password`, `/reset-password`, `/workspace`, `/organizer/staff` and `/settings/profile` for ru/kk/en. C1 adds `/organizer/seasons`; C2 adds `/team`, `/team/[teamId]` and `/subteam/[subteamId]` with private scope checks. C3b adds `/organizer/tournaments/[tourId]` for versioned settings and reusable stage plans; season pages expose readiness and the actual start action. Callbacks remain unlocalized. Old auth/workspace bookmarks redirect to Russian equivalents; signup redirects to staff login. Organization onboarding is retired. `/` and `/live` retain transitional public pages until G. Historical routes: archive/PHASE_1_ROUTES.md.

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

| Localized route                                     | Required permission                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| /login, /forgot-password                            | Public; recovery is enumeration-safe                                      |
| /reset-password                                     | Verified recovery/account session; can activate pending provisioned staff |
| /workspace                                          | Active staff landing page                                                 |
| /organizer/staff                                    | Organizer account/role/provisioning controls                              |
| /organizer/seasons, /organizer/tournaments/[tourId] | Organizer only                                                            |
| /hall                                               | Organizer/Main Judge operations                                           |
| /team                                               | Assigned teams for Trainer; all teams for Organizer/Main Judge            |
| /team/[teamId]                                      | Authorized club management                                                |
| /subteam/[subteamId]                                | Authorized roster management                                              |
| /subteam/[subteamId]/tour/[tourId]                  | Active season roster (no separate submission)                             |
| /matches/[matchId]/lineup                           | Own-team Trainer lineup submission                                        |
| /matches/[matchId]/manage                           | Organizer/Main Judge oversight                                            |
| /linear-judge                                       | Active Line Judge with venue-date/table assignment                        |
| /settings/profile                                   | Self profile; not role editing                                            |

Auth callbacks stay unlocalized `/auth/confirm` and `/auth/callback`. They accept only fixed token types and known local destinations. Auth routes and old bookmarks redirect safely to their localized equivalents; public signup is removed and provider signup disabled in B. Reset/activation must function before active staff access; ordinary private access requires active provisioning.

## Server endpoints and compatibility

Scoring uses POST `/api/scoring` with origin check, schema validation, verified identity and database command authorization. Private snapshot/status endpoints are no-store and reauthorize each call. Public snapshot endpoints return published safe projections and support five-second fallback polling. Exact endpoint files/contracts are finalized before their milestone.

Changing locales must not bypass proxy refresh, staff authorization or resource checks. UUID validation and indistinguishable not-found responses protect private resource existence. Canonical new routes do not require deleting legacy data. Retire `/register` and organization creation at B's onboarding switch; remove old organization navigation after the new staff landing is verified.

## Photo endpoints (C3a)

`GET /api/public/player-photo/[playerId]` reads only an approved sanitized JPEG projection using an anonymous client. Pending/revoked/unknown images return 404; responses are no-store. `GET /api/staff/photos/[assetId]` reauthorizes the private original on every request; `?kind=evidence` additionally requires the uploader or Organizer and downloads as an attachment. Private responses are no-store and never expose a Storage URL. Publication/revocation uses Organizer-only Server Actions plus independently authorized RPCs.

## Draw operations (D1)

Localized `/draws` and `/draws/[tourId]/[ageGroup]` require Organizer or Main Judge. A group query parameter switches between seed/group previews and classification dependencies; one group/bracket is displayed at a time. UUID/age validation and per-request staff checks apply before data reads. Proxy refresh/no-store covers the entire route family. Configuration pages link to each age; Main Judges enter through their own Draws navigation without access to Organizer settings. Public draw pages/projections remain G.

## Match lineups (D2)

Localized `/matches` lists published matches with pagination: assigned Trainer scope, or Organizer/Main Judge oversight. `/matches/[matchId]/lineup` reauthorizes match scope and displays only the caller’s permitted lineup rows. Officials see flags until joint reveal; afterward they can replace pending singles players. The page does not start/score a match. Private player DOB/contact is never included in its client form candidates.

`GET /api/staff/matches/[matchId]/lineup-status` verifies Auth and database permission on every read, returns only flags/version and sets private no-store. Anonymous requests return 401; inaccessible match IDs return indistinguishable 404 responses. The browser stops hidden-tab polling and backs off on failures. Private snapshots and route families are included in proxy refresh matching. Public lineup projections remain G.

## Group standings (D3a)

The existing localized `/draws/[tourId]/[ageGroup]?group=...` page adds current group standings, complete/provisional/unresolved states and mini-table evidence. Organizer/Main Judge may refresh from current result revisions; only Organizer sees and may execute a final audited random draw, with a required confirmation and current revision. Actions reauthorize and use the verified user's client; direct RPC authorization independently enforces the same roles. Bracket participants show actual advanced club names. No native result-entry control is added before E.

Private lineup status now includes `sources_ready`, a boolean only. A stale qualifier source disables submission in the page and is rejected independently by the database. No hidden identities are added to polling.

## Seed adjustment (D3c)

The private draw page exposes two club-labelled seed selectors and a required reason/confirmation only to Organizers while the latest draw remains a draft. A successful swap shows the new revision and reason, resets the form, and rebuilds group/bracket previews from copied frozen inputs. Publication removes adjustment controls; an independent RPC guard rejects direct/stale changes. Main Judge review/publication routes remain available.

## Lifecycle and transfer repair contracts (E2b1)

Authorized database operations now expose `manage_match` and `get_match_operation`; their manager/assigned-judge checks do not depend on UI visibility. HTTP management/judge screens arrive in E2c/F. Existing lineup pages show duplicate-player guidance only after joint reveal and while the pairing can still be repaired. Replacements exclude every player already selected on either side; an unstarted cancelled transfer collision can be repaired, while completed-match cancellation remains locked. No DOB or early selected identities enter status polling or operation snapshots.

## Judge desk and score transport (E2c)

Localized `/linear-judge` discovers the caller's current venue-day table and its actual assigned match. An unassigned judge sees an explicit setup state; a called/unrevealed match shows only status, while a live jointly revealed match links to the next singles. `/linear-judge/[gameId]` reauthorizes the safe private score snapshot. A compact judge layout keeps table controls visible on landscape tablets and small phones. Organizer/Main Judge may inspect a revealed score, but controls require the actual current scoring assignment; role alone does not enable writes.

`GET /api/staff/judge-desk` and `/api/staff/scoring/[gameId]` verify Auth, consume a per-staff read budget and invoke authorized RPCs. `POST /api/scoring` requires the configured trusted Origin, rejects cross-site requests, bounds the JSON body to 8 KiB and strictly validates command/game IDs, version, action, side and note. It verifies Auth and a distributed write budget before forwarding the caller's JWT to `score_command`. Anonymous requests fail; inaccessible game IDs have indistinguishable 404 responses. Errors are stable codes, not raw SQL messages. Every response is private no-store. Proxy refresh includes these endpoints and localized judge routes.

The UI uses committed acknowledgements without optimistic or offline scoring. It disables controls while hidden, stale, disconnected, sending or awaiting an uncertain command. Only an unresolved command payload is retained in staff/game-scoped session storage; reload/retry uses the same UUID and never stores a player snapshot. Private polling backs off, stops while hidden and ignores older score/match versions. Timeout countdown follows the server deadline using elapsed monotonic time. Last-point undo and confirmed set-clear preserve timeout usage. Finished singles are read-only and link to the next game when appropriate. RU/KK/EN copy is provided; public live delivery remains G and hall assignment/automatic allocation UI remains F.

## Official correction review (E3b2)

`/[locale]/matches/[matchId]/corrections` lists completed singles and private proposal history for Organizer/Main Judge. `/{locale}/corrections/[requestId]` shows proposed terminal set scores/winner, saved K, team outcome and affected dependency statuses before application. Zod-validated Server Actions use the verified user's client; SQL independently enforces all authority and digest checks. Started-play resolution has a separate required Organizer checkbox. Applied/stale/error/empty states and RU/KK/EN copy are provided. Proxy refresh/private no-store covers both routes. Trainers and Line Judges cannot enter official correction controls.

## Hall controls (F)

`/{locale}/hall?tour=[tourId]` is Organizer/Main Judge-only, with real tournament selection, physical tables/current owners, rest/source/lineup readiness, called highlighting, allocate/start-all, explicit takeover/release and assignment history-backed operations. `/{locale}/matches/[matchId]/manage` provides assign/release/call/start/corrected-resume with required reasons and expected match versions, plus lineup/correction links. Hidden selections are absent. `GET /api/staff/hall/[tourId]` verifies identity, manager permission and a distributed read budget; it is private/no-store. Polling stops when hidden or a form is being edited; failures display a stale-state notice. Zod validates every Server Action before an independently authorized user-client RPC. RU/KK/EN messages and mobile layouts are included.

## Public league and live delivery (G)

`/` and `/live` redirect to `/ru` and `/ru/live`. Localized public routes now include home, `/ranking`, `/player/[playerId]`, `/teams`, `/seasons`, `/season/[seasonId]`, `/tournament/[tourId]`, its `/matches`, `/match/[matchId]` and `/draws/[drawId]`, `/live`, `/live/[matchId]` and `/scoreboard`. Match aliases validate the tour/match relationship before redirecting. Real published data, explicit setup/empty/error states, RU/KK/EN text, locale-preserving links, accessible keyboard navigation and localized dates/numbers are included. Player pages show effective rating histories, best played wins and approved photos only. Public draws show true group ranks/ratios and data-derived placement bands.

`GET /api/public/matches` returns only currently called/live rows (optionally an entire selected tour); `/api/public/matches/[matchId]` returns a safe versioned projection. Anonymous responses allow at most one second of shared caching; reconnect/version-gap `fresh` requests bypass caching. Private/session APIs and photo bytes remain no-store. Public Realtime uses an isolated anonymous singleton, twenty-second heartbeat and backoff/jitter. Subscribe then fetch, monotonic merge, version-gap recovery, reconnect/refocus/online resync and five-second polling preserve committed authority. Results also invalidate server-rendered rankings/history/standings, with bounded visible-page polling fallback.

The manifest and generated brand icons support installation. The service worker positively allowlists only four static public shell assets. It never caches navigations, Auth/session/private APIs, score commands or even public score responses. Offline scoring is unavailable. Its scope does not grant private data access; all non-allowlisted requests use the network.
