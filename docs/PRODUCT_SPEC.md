# Tennora product specification

## Product and audience

A multi-tenant tournament workspace for independent tennis organizations, with public published tournament information and authoritative live scores. One account may belong to many organizations and hold multiple roles in each.

## Phase 1 contract

Deliver reproducible Next.js/TypeScript tooling; accessible light/dark design tokens and shadcn-style primitives; public welcome and match-center foundation; email/password registration, confirmation, login, logout and password recovery; a protected workspace; editable profile; organization creation and membership-based organization switching. No simulated production tournament counts, matches, players or scores. Missing backend configuration produces a useful setup state, never a fake authenticated session.

Organization onboarding is included only to establish the tenant boundary. Invitations, staff management and tournament CRUD are Phase 2. Public match center clearly communicates that live tournament publishing arrives in a later milestone.

## Roles

Platform admin is a separately provisioned platform capability, never user-editable metadata. Organization membership roles are owner, tournament_director, scorekeeper and player; a membership has one or more roles. Spectator is public read capability, not a privileged membership. Phase 1 permits organization self-creation with owner membership and reads the caller's memberships. Later phases add staff mutation policies and platform administration.

## Later product requirements

- Staff configure tournaments, IANA timezone, dates, deadlines, divisions, courts, limits, registrations and assignments.
- Singles knockout draws of 8/16/32 support seeded/random placement and byes. Publication locks regeneration; privileged explicit replacement requires audit history.
- A pure scoring state machine supports deuce/advantage, games, sets, tie-breaks and best-of-three format definitions.
- Assigned scorekeepers submit validated, idempotent commands against a version. PostgreSQL locks the score row, rejects stale versions and commits snapshot/action/advancement atomically.
- Undo and administrative correction are new immutable actions referencing prior actions, with actor, reason and before/after state.
- Public Realtime events trigger authoritative snapshot reads. Reconnect always resyncs. Events cannot independently set official state.
- Organizer and mobile scorekeeper interfaces have clear pending, offline, stale/conflict, success and correction states.

## Acceptance matrix

| Scenario                                            | Milestone and proof                                  |
| --------------------------------------------------- | ---------------------------------------------------- |
| Tenant A cannot read tenant B private data          | Phase 1 database permission tests; expand each phase |
| One user has distinct/coexisting organization roles | Phase 1 schema and database tests                    |
| Scorekeeper cannot score unassigned match           | Phase 4 RPC and database tests                       |
| Duplicate scoring request awards one point          | Phase 4 idempotency transaction tests                |
| Concurrent requests preserve state                  | Phase 4 competing real database transactions         |
| Spectator recovers after disconnect                 | Phase 5 browser/network recovery tests               |
| Winner advances exactly once                        | Phase 3/4 unique bracket-slot and transaction tests  |
| Correction is audited                               | Phase 4 action/audit tests                           |
| Tournament timezone is honored                      | Phase 2 timezone tests and browser checks            |

## Visual direction

Court green #164D39, chalk #F7F9F6, ink #172C23, muted sage #617568, ball yellow #D5EF72 and line #DCE5DD. A quiet application shell with a court-line illustration as its signature. Display: Georgia italic, used sparingly; body: system sans; score/data: monospace. This deliberately avoids invented tournament statistics and dashboard charts before data exists. Layout: narrow persistent sidebar, wide workspace, mobile navigation in normal flow. Keyboard focus, native labels, 44px targets, reduced-motion support and persistent theme choice are required.
