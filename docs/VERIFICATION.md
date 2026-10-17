# Phase 1 verification

Completed locally on 17 October 2026 (Asia/Almaty). No later product phase was implemented. The final checks passed on the host Node 26.5.0 and the declared deployment target Node 24.22.0 LTS.

## Delivered files

- Planning: AGENTS.md and PRODUCT_SPEC, ARCHITECTURE, DATABASE, ROUTES, IMPLEMENTATION_PLAN in docs, created before application implementation.
- Foundation: package/lockfile, TypeScript/ESLint/Tailwind/shadcn configuration, Vitest/Playwright configuration, Netlify build settings, GitHub CI workflow, env example and local setup/type-generation scripts.
- UI: public welcome and explicitly upcoming match center; responsive public/auth/workspace layouts; semantic light/dark tokens; brand, court illustration, Button/Input/Card, theme control, form feedback, setup/loading/error/not-found states.
- Auth: validated email/password registration, confirmation, login, logout, password recovery/update and profile editing; request-scoped Supabase clients and refresh proxy; independently verified Server Actions; no service-role credential in application code.
- Organizations: membership-backed organization listing/switching, atomic owner onboarding and audit creation, member-only organization page. Later tournament and invitation controls are absent.
- Database: 202610170001_foundation.sql, actual generated database.types.ts and foundation.test.sql.

## Verified results

| Check                    | Result and scope                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean dependency install | `npm ci --ignore-scripts` succeeded with pinned lockfile; `npm ls --depth=0` resolved cleanly                                                                                                                                                                                                                                       |
| TypeScript               | `npm run typecheck` passes, including generated database types and browser tests                                                                                                                                                                                                                                                    |
| Lint                     | `npm run lint` passes with zero warnings                                                                                                                                                                                                                                                                                            |
| Pure contracts           | 33 Vitest tests pass: input validation, privilege-field stripping, redirect allowlist, configuration and trusted email origins                                                                                                                                                                                                      |
| Production compilation   | `npm run build` passes using Next's supported Webpack compiler; all 13 application/metadata routes build                                                                                                                                                                                                                            |
| Public browser suite     | 8 Playwright checks pass across desktop Chromium and emulated mobile Chromium: navigation, theme persistence, callback rejection, unauthenticated/setup guards, keyboard skip link, no overflow and no page JavaScript errors                                                                                                       |
| Database permissions     | 30 real pgTAP assertions pass on local Supabase PostgreSQL 17: two-tenant isolation, self-only profile/membership access, different/coexisting roles, denied escalation, owner-only audit reads, denied audit mutations/forgery, anonymous denial, RPC validation/atomic creation and duplicate constraints                         |
| Real auth browser suite  | 1 complete local-backend scenario passes: UI signup -> Mailpit confirmation email -> confirmed session -> organization/RPC/audit -> persisted profile -> second user's tenant denied -> logout guard -> bad-password rejection with email retained -> login -> Mailpit recovery email -> password update -> login with new password |
| Visual review            | Inspected desktop/mobile public, auth and organization pages, with light/dark public/auth screenshots. Workspace mobile overflow assertion passes. The auth suite captures organization screenshots under ignored test-results; public review screenshots are temporary artifacts                                                   |
| Formatting               | `npm run format:check` passes                                                                                                                                                                                                                                                                                                       |
| Runtime dependency audit | `npm audit --omit=dev` reports zero known vulnerabilities                                                                                                                                                                                                                                                                           |

The browser suites ran both before configuration (explicit setup/disabled auth) and after local backend connection (real auth guards). Supabase tests ran with actual anon/authenticated roles and JWT claims, not mocks. The real auth test creates disposable local users/organizations and removes its fixtures. CI configuration is provided; no hosted GitHub run has occurred.

## Findings fixed during verification

- Callback redirects based on the server's normalized host switched 127.0.0.1 to localhost and lost host-scoped session cookies. Callback responses now use safe relative Location values; full real confirmation/recovery flows pass.
- React action completion reset uncontrolled inputs on errors. Auth and organization forms now retain non-secret inputs; passwords clear after a submitted action. The browser test verifies failed-login email retention.
- Database type generation now writes only after successful generation and formats the result, preserving the previous types on command failure.

## Environment and remaining limits

- Docker was initially stopped; local Supabase images were downloaded and a local stack was started. Only database, auth, API gateway/REST and Mailpit were started for Phase 1; live/Storage product flows remain later work.
- Turbopack's production CSS worker failed with a local port-permission error. The build script explicitly uses `next build --webpack`, which passed. Development uses Next's default Turbopack and was verified by browser tests.
- Full `npm audit` reports five high-severity entries in the development-only chain eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces (GHSA-vfj7-8cjw-p6xm). The registry's latest braces is still 3.0.3 with no patched release available. These glob parsers are not shipped in the production runtime. Avoid force-downgrading Next to the obsolete major suggested by npm audit; revisit the upstream patch before production readiness. ESLint 9.39.5 is deprecated but pinned because the current Next lint plugins' declared peers exclude ESLint 10; the latter produced peer conflicts.
- No hosted Supabase, SMTP delivery, Netlify deployment, real mobile device or Safari run was performed. The deployment checklist is in README.md. Local backend/test keys are ignored files; no production credentials were provided.
- Invitations, platform administration, tournament CRUD, scheduling/timezone rendering, draws, scorekeeper assignment, scoring/concurrency/idempotency, correction and Realtime reconnection acceptance scenarios are planned in subsequent milestones and are not claimed as working.

## Next milestone

Phase 2: expiring organization invitations, scoped staff management, tournament/division/court configuration, registration lifecycle and tournament-timezone scheduling. See IMPLEMENTATION_PLAN.md for the remaining gates. Stop here until the user authorizes the next phase.
