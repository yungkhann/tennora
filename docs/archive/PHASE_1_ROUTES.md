# Routes

## Phase 1

| Route                                     | Access             | Purpose                                              |
| ----------------------------------------- | ------------------ | ---------------------------------------------------- |
| /                                         | Public             | Product welcome with real navigation                 |
| /live                                     | Public             | Explicit live-center foundation empty state          |
| /login                                    | Public             | Email/password sign in                               |
| /register                                 | Public             | Account creation with email confirmation             |
| /forgot-password                          | Public             | Enumeration-safe recovery request                    |
| /reset-password                           | Verified session   | Password update after recovery confirmation          |
| /auth/confirm                             | Token verification | Allowlisted signup/recovery OTP callback             |
| /auth/callback                            | Code exchange      | PKCE callback with safe destination                  |
| /dashboard                                | Authenticated      | Own organization list and create-organization action |
| /dashboard/organizations/[organizationId] | Member only        | Organization workspace foundation                    |
| /settings/profile                         | Authenticated      | Self-only display-name update                        |

Protected pages recheck identity and resource access. Every action independently rechecks identity. UUID organization IDs are validated; cross-tenant requests return the same 404 as unknown IDs. Authenticated routes preserve no private data in shared caches. No phase-2 navigation masquerades as working tournament controls.

## Planned

Phase 2: organization settings/members/invites; tournament creation/detail/divisions/courts/registrations; invitation acceptance. Phase 3: tournament draw editor and published draw. Phase 4: /score/[matchId] and controlled correction. Phase 5: /tournaments/[slug], /live/[matchId] and public published match center.
