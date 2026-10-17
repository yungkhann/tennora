# Database relationships and security

## Phase 1 implemented schema

Migration 202610170001_foundation.sql introduces profiles, organizations, organization_members and audit_logs. All primary keys are UUIDs; timestamps are timestamptz. All exposed tables enable RLS with explicit grants.

- profiles.id -> auth.users.id (cascade). Self-only select and constrained display_name update. Email remains in Auth. Auth insert trigger creates a profile; user metadata may supply only a bounded display name, never privileges.
- organizations.id has name, unique slug, created_by -> auth.users, created_at and updated_at. Only members read organizations. No anonymous reads.
- organization_members.id has organization_id -> organizations, user_id -> profiles, roles organization_role[] (nonempty, unique, valid enum), unique(organization_id,user_id), timestamps and user lookup index. Roles may coexist. Callers read their own memberships; no direct membership writes.
- audit_logs.id has organization_id -> organizations, actor_id -> auth.users, action, entity_id, details jsonb and created_at. Append only through trusted database functions; owners read organization audit. No client insert/update/delete grants.

create_organization(name,slug) is a narrowly scoped SECURITY DEFINER transaction with fixed empty search_path and schema-qualified references. It requires auth.uid(), validates input, inserts organization and owner membership and one audit row atomically. EXECUTE is revoked from public/anon and granted only to authenticated. There is no role mutation API in Phase 1. Private helper membership checks avoid recursive RLS. Profiles cannot change role/identity, memberships cannot be self-granted, owner status cannot be obtained by editing auth metadata.

## Planned tables, introduced incrementally

| Table                   | Relationships and invariants                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| organization_invites    | organization, inviter, normalized email, roles, hashed single-use token, expiry, acceptance. Unique pending invite; acceptance transaction validates verified email. |
| tournaments             | organization, creator, name, IANA timezone, UTC start/end and registration deadline, location, limit, draft/published state.                                         |
| divisions               | organization + tournament, format definition, age/level eligibility, draw size.                                                                                      |
| courts                  | organization + tournament, name; unique tournament/name.                                                                                                             |
| registrations           | organization + division + profile; approval/withdrawal status, unique division/player.                                                                               |
| entries                 | organization + division, seed, eligibility; unique division/seed when seeded.                                                                                        |
| entry_members           | organization + entry + profile; unique entry/player, singles cardinality enforced transactionally.                                                                   |
| matches                 | organization + division + court, round/position, status, start_at, winner entry, next_match/slot. Unique division/round/position.                                    |
| match_slots             | organization + match + slot 1/2, entry or source match; unique match/slot.                                                                                           |
| scorekeeper_assignments | organization + match + user, unique match/user; membership and assignment both required.                                                                             |
| match_scores            | one per match, organization, authoritative state jsonb, integer version, format snapshot, updated_at.                                                                |
| score_actions           | organization + match, command UUID, actor, expected/result version, command, before/after, reason. Unique match/command UUID and match/result version; immutable.    |

Every tenant-owned future record carries organization_id. Composite unique keys and composite foreign keys (organization_id,parent_id) prevent cross-tenant references even in privileged functions. Draw publication, bracket replacement, invitations, scoring and corrections use dedicated transactional functions with minimal EXECUTE grants. Staff roles are checked at the resource, scorekeeper role alone does not imply assignment. Platform admin is separately provisioned, audited and not inferred from email or metadata.

## Public data

Future policies allow anonymous read only through explicit published tournament ancestry and approved public-safe fields. Player private profiles, invitations, drafts and audit logs stay private. Use safe projections/views with security_invoker where appropriate; RLS alone does not hide columns. Phase 1 grants anon no access to foundation tables.

## Verification

supabase/tests/foundation.test.sql exercises actual roles/JWT claims: anonymous denial, self-only profiles/memberships, two-tenant isolation, multiple/coexisting roles, denied role escalation, validation, atomic owner onboarding and append-only audit. Tests roll back all fixtures. Run with `npm run test:db` after a local Supabase start. Do not equate static SQL inspection with an executed RLS test.
