# Tennora

Multi-tenant tennis workspace built with Next.js App Router, TypeScript, Tailwind v4, locally owned shadcn/ui primitives and Supabase. **Phase 1 only**: auth, profiles, organization onboarding, tenant isolation and public/protected layouts. Tournament operations and live scoring are planned, not implemented.

## Run locally

Use Node 24 LTS (`nvm use`), npm, and Docker for local Supabase.

```sh
npm ci
npm run db:start
npm run db:reset
npm run db:env
```

`db:env` writes ignored local app/test environment files without printing keys and refuses to overwrite existing files. Alternatively, copy `.env.example` to `.env.local` and use `npx supabase status` to get the local API URL and publishable key (the legacy local anon key also works). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` in `.env.local`. Start with `npm run dev -- --hostname 127.0.0.1`. Open http://127.0.0.1:3000. Restart Next after changing environment values.

The app also runs without Supabase: public pages and auth layouts are inspectable, auth submission is disabled, and private pages show setup instructions. There is no mock login or production seed data.

Local confirmation/recovery emails appear in Mailpit at http://127.0.0.1:54324. Email confirmation is enabled. Create an account, open the local email, confirm, and create an organization in the workspace. Use a second account to check isolation. `db:reset` deletes local development data; use it only against the CLI's local stack.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:db
```

Install browser engines once with `npx playwright install chromium`. `test:e2e` covers public/mobile layouts, theme persistence, callback denial and unauthenticated guards. `test:db` requires local Supabase and executes real pgTAP permission tests. Regenerate checked-in database types after schema changes with `npm run db:types`.

For real-backend browser tests, set `E2E_SUPABASE_SERVICE_ROLE_KEY` **only in `.env.test.local` or the test runner process** using the local `npx supabase status` output; then run `npm run test:auth`. These tests create disposable Auth users, exercise confirmation/login/recovery/profile/organization flows, and clean up their rows. Never use a production backend or put this key in a `NEXT_PUBLIC_` variable. Tests validate that the backend is loopback before using admin credentials.

## Hosted Supabase and Netlify

1. Create a Supabase project. Apply the migration with your normal reviewed Supabase migration workflow (`supabase link` then `supabase db push`). No application service-role credential is needed.
2. Set Auth Site URL to the deployed HTTPS origin. Allow the exact `/auth/callback` redirect for each trusted deployment origin. Enable email confirmations, set minimum password length to 12, and configure SMTP, provider rate limits and abuse protections for public registration.
3. Configure email templates for cross-device confirmation. Confirmation link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. Recovery link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. Local template files are in `supabase/templates`.
4. Connect this repository to Netlify and set the three public env variables from `.env.example`, with `NEXT_PUBLIC_SITE_URL` equal to the trusted HTTPS origin. The app uses SSR and Server Actions; no static export. Netlify automatically supplies its Next.js adapter.
5. Run database tests in a disposable environment, then smoke-test real confirmation, recovery, logout and two-account tenant isolation on deployment. Deployment is not part of Phase 1 verification.

Supabase Auth enforces provider rate limits; application-wide rate limiting and observability are later production-readiness work. Password changes use a verified user session. Harden provider session lifetime/reauthentication settings for deployment. Organization role-management and platform-admin interfaces are intentionally deferred.

## Project map

- [Product scope](docs/PRODUCT_SPEC.md)
- [Architecture and official references](docs/ARCHITECTURE.md)
- [Database relationships and policy model](docs/DATABASE.md)
- [Routes](docs/ROUTES.md)
- [Milestones](docs/IMPLEMENTATION_PLAN.md)
- [Verification results](docs/VERIFICATION.md)

Design uses court green, chalk and tennis yellow, a system sans/Georgia pairing without remote font requests, and light/dark semantic tokens. Components follow shadcn/ui's locally owned Radix/CVA pattern; `components.json` supports adding components as needed.
