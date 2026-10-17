# Architecture

## Runtime

Next.js App Router with TypeScript, React Server Components by default, Server Actions for first-party mutations and Route Handlers for auth callbacks. Tailwind v4 semantic tokens and locally owned shadcn/ui primitives. Supabase hosts PostgreSQL/Auth; Storage and Realtime are integrated when assets/live scoring are implemented. Netlify OpenNext handles SSR and actions; no static export.

## Trust boundaries

Browser -> Server Action (Zod + independently verified user) -> request-scoped Supabase client (user JWT) -> PostgreSQL RLS and constrained functions. No service-role key in the app. A valid session proves identity, not organization authority. Organization URLs are opaque UUIDs, validated before queries; unauthorized and nonexistent organizations share a not-found response.

Supabase SSR uses per-request cookie clients, async Next cookies and a Next 16 proxy to refresh sessions. Layouts and mutations call getUser for a fresh identity. Proxy is only session refresh, never the sole authorization gate. Private/auth routes are dynamic and private/no-store. Callback destinations use a small local-path allowlist to prevent open redirects. Relative Location responses preserve the browser origin behind development/hosting proxies. Password recovery exchanges the email token on the server before rendering an authenticated password form.

## Modules

- src/app: route composition, metadata, loading/error/not-found boundaries.
- src/components/ui: reusable shadcn-compatible primitives; shared brand, shell and theme controls outside ui.
- src/features/auth: validated forms and Server Actions.
- src/features/organizations: tenant onboarding and membership-backed workspace.
- src/lib/supabase: browser/server clients and database types.
- src/lib: pure validation, redirect and date utilities.
- supabase/migrations and supabase/tests: schema evolution and real database RLS tests.
- tests: Vitest contracts, Playwright public/missing-config tests and opt-in real-backend authentication tests.

## Future scoring transaction

RPC receives match ID, command UUID, expected version, validated command and correction reason where required. It verifies active membership plus assignment, locks match_scores FOR UPDATE, checks existing command UUID before version, invokes/rechecks deterministic transition, appends immutable score_actions and updates snapshot/version. Completion fills the uniquely constrained downstream slot in the same transaction. Transport retries reuse command UUID. Full transaction/concurrency proof is Phase 4, not part of this foundation.

## Live/Storage plan

Subscribe only to authorized/published records; RLS applies to snapshot fetches and Realtime authorization. On subscription ready/reconnect/refocus fetch authoritative versioned snapshot and discard stale in-flight responses. Store organization logos in tenant-prefixed paths with matching membership policies; public assets need explicit publication. No bucket or permissive Realtime policy is provisioned before its product flow exists.

## Configuration and deployment

Use NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and trusted NEXT_PUBLIC_SITE_URL. Validate configuration at the boundary. Unconfigured local app remains inspectable but mutations explicitly fail closed. Netlify production requires all values, migrated database, allowed redirect URLs, correct email templates and SMTP/auth rate limits. Never derive email destination origins from caller-controlled headers.

## Official references

- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://ui.shadcn.com/docs/tailwind-v4
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/

Stable registry versions are pinned in package.json and package-lock.json; official documentation was consulted before implementation.
