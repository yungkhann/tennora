# Tennora

One table tennis league on Next.js App Router, TypeScript and Supabase. Implementation follows [the task ledger](docs/IMPLEMENTATION_PLAN.md). The staff foundation adds coexisting Organizer, Main Judge, Trainer and Line Judge roles. Season/tournament configuration, clubs, scoped Trainers, private players, season rosters, transfers and dropout history are implemented in C1/C2. Private photo/consent uploads and Organizer publication/revocation are implemented in C3a. Versioned tournament settings, stage templates and guarded season start complete Task C. Organizer/Main Judge can generate and publish frozen group draws and classification match graphs in D1. Match lineups, scoring and public league pages follow in D2–G; public pages currently show explicit empty states. Original organization records/history are retained, but organization onboarding is retired.

## Run locally

Use Node 24 (`nvm use`), npm and Docker.

```sh
npm ci
npm run db:start
npx supabase migration up --local
npm run db:env
npm run dev -- --hostname 127.0.0.1
```

`db:env` creates ignored `.env.local` and `.env.test.local`, without printing credentials or overwriting existing files. For existing files, configure the public URL/key/site origin and **server-only** `SUPABASE_SECRET_KEY` from `.env.example`. This secret is used only for Organizer-authorized Auth administration. Never put it in a `NEXT_PUBLIC_` variable. Restart Next after changing environment values. No production seed accounts/passwords are committed. Do not run `db:reset` against data you need; it is destructive.

Public signup is disabled. To invite the first Organizer without a preset password, run the trusted operator command with the intended email:

```sh
node scripts/invite-first-organizer.mjs <email>
```

Open the invitation, verify the email and choose a password through the application. Local email is captured in Mailpit, not delivered to Gmail. For an explicitly chosen existing Auth identity, use:

```sh
node scripts/bootstrap-organizer.mjs <existing-auth-user-uuid>
```

Bootstrap refuses once an active Organizer exists. Legacy organization ownership and metadata never grant staff authority. Open `/ru/login`, `/kk/login` or `/en/login`. Organizer account management is at `/{locale}/organizer/staff`; multiple roles are allowed. The Organizer supplies an initial password and shares it securely outside the app; provisioning does not send invitation email. Existing Auth emails are not automatically linked. Retries use the reserved operation ID. Password recovery emails appear in local Mailpit at http://127.0.0.1:54324.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:db
npm run test:e2e
npm run test:auth
```

Install Chromium with `npx playwright install chromium`. Database tests require local Supabase. Regenerate types with `npm run db:types`. Real Auth tests use the loopback backend and `E2E_SUPABASE_SERVICE_ROLE_KEY` in ignored `.env.test.local`, create disposable staff fixtures and clean them up. The fixture SQL bootstrap proof rolls back its isolated changes, and browser fixtures seed their own roles, so a real local Organizer can remain present. The application also needs its server Auth admin secret for provisioning tests. Never target production with test credentials/fixtures.

## Hosted setup

Apply reviewed additive migrations to staging before production. Set the public environment values plus the isolated server secret in hosting. Disable **global public signup**, retain email login, require 12-character passwords, set the trusted HTTPS site origin and exact `/auth/callback` redirects, and configure SMTP/rate limits. In this CLI version `[auth.email].enable_signup` controls the email provider itself; keep it true while `[auth].enable_signup=false` blocks signup. Verify the hosted equivalent with both login and direct signup probes.

Recovery template: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. The confirmation endpoint accepts invitation/recovery tokens only. Configure the invite template too: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`. Sessions use HTTP-only cookies, server refresh and no-store responses; the public Supabase client has no persisted Auth session. Keep staging and production separate. Netlify uses its Next.js adapter with SSR/Server Actions, not static export. Local results are not deployment/readiness evidence.

## Project documents

- [Product scope](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Routes](docs/ROUTES.md)
- [Milestones and status](docs/IMPLEMENTATION_PLAN.md)
- [Decisions](docs/DECISIONS.md)
- [Historical Phase 1 verification](docs/VERIFICATION.md)
