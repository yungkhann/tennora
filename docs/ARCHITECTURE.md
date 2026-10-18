# Architecture

Task A target architecture, 17 October 2026. This describes the authorized direction, not completed league features. Historical architecture: archive/PHASE_1_ARCHITECTURE.md. Implementation evidence: VERIFICATION.md and milestone reports.

## Runtime and boundary

Next.js App Router/TypeScript supplies server-rendered pages, Server Actions and Route Handlers. Supabase supplies Auth, PostgreSQL, Storage and Realtime. Use current pinned packages and the installed Next.js docs before code changes. Reuse Tailwind/shadcn tokens, components and tests. No Django, Redis, Celery or custom hosted WebSocket server is required.

Browser -> verified Next.js action/handler -> request-scoped Supabase client carrying user JWT -> RLS and constrained PostgreSQL RPC. Business actors come from auth.uid(), not request metadata. One league replaces tenant navigation; trainer club boundaries and judge table/day boundaries still apply at the database.

## Staff sessions and provisioning (Task B)

Keep staff JWT/refresh tokens in secure HTTP-only cookies, refreshed on the server/proxy. The browser uses no authenticated Supabase client. Anonymous public Realtime is isolated from staff Auth storage. Prove refresh, recovery, rotation, logout and deactivation with real local Auth before declaring this integration complete; this is a server-mediated design rather than Supabase's default browser-auth pattern.

Every private page/action/REST endpoint independently verifies user identity and active staff state. Include localized routes in proxy refresh matching. Private/auth responses are no-store; no authenticated ISR or service-worker caching. Origin protections apply to actions and explicit Route Handler mutations. Callback paths use a strict local allowlist and relative Location responses. Never derive email origins from untrusted headers.

A server-only admin client is the narrow exception for Organizer-authorized Auth create/reset/deactivate operations. Its secret is never NEXT_PUBLIC, serialized or used as the normal data client. Business records continue to use the caller's identity. Track provisioning pending/active/failed because Auth administration and SQL are not one transaction. Bootstrap the initial Organizer through trusted operator tooling, never organization ownership, email heuristics or user metadata.

## Domain and database

Players have independent IDs, not Auth profile identities. Separate private player data/consent evidence from public approved projections. Staff role changes, account deactivation and history need live database checks even when a previously issued JWT remains valid. See DATABASE.md for model boundaries and DECISIONS.md for unsettled rules.

Keep pure TypeScript scoring/draw/rating modules separately testable. PostgreSQL is authoritative: directly callable score RPCs must validate/recompute transitions, not accept a caller-supplied official score. Shared vectors and generated command sequences prove TypeScript/SQL parity. UUID command receipts, payload consistency, expected versions and row locks protect against duplicates and races. Use deterministic lock ordering for match/game and player ratings.

One transaction appends event/receipt, updates set/game/team status, synchronous Elo/history, necessary advancement/public projection and before/after audit. Three singles wins cancel remaining games exactly once. Failures roll back everything. Corrections append events and preserve original K/history; post-completion behavior is blocked on D07. Queued work cannot determine official score or advance from stale standings.

## Live transport

Judge commands use authenticated HTTPS -> Next.js -> PostgreSQL RPC. Realtime distributes committed public-safe notifications; clients fetch authoritative snapshots after subscription, reconnect, refocus or version gaps, ignoring stale fetch responses. Retry an unacknowledged command with its existing ID and reconcile its receipt first. There is no optimistic point award.

Only safe published projections enter anonymous Realtime. Never subscribe public browsers to private lineup/player tables. Staff-private status uses bounded authorized polling with no cross-session cache; committed mutation responses return private state. Judge connection status reflects command/snapshot reachability and freshness. Public fallback polls cached safe snapshots every five seconds. Benchmark provider limits/fan-out before UI expansion; switch notification strategy if needed without changing authority.

## Files, jobs and deployment

Private Storage holds player originals and consent evidence; approved photo delivery must support revocation/cache invalidation. Database backups do not restore Storage bytes; recovery must cover both. Durable SQL jobs/outbox with idempotent retries handle delayed rankings/photo work; scores and Elo remain synchronous.

Use separate staging/production projects, Netlify-compatible Next.js hosting and reviewed deployment migrations. Preserve RPO 5 minutes, RTO 30 minutes, encrypted off-site copies and retention targets until explicitly revised. Verify paid/available PITR and restore performance early; do not assume service-tier capability. External alerts, region and consent-process decisions precede real minors' data.

## References

- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/platform/backups
- https://nextjs.org/docs/app/guides/authentication

These are design references, not evidence of implemented product behavior.

## Implemented readiness boundary (H)

`/api/health` probes an anonymous database clock with a five-second timeout and no-store response. Server-only observation emits random request IDs, operation/status and elapsed time; it does not serialize staff/player/request data. `Server-Timing` distinguishes end-to-end handler and RPC round trips, neither of which substitutes for measured database commit latency. CI boots actual Auth/Storage/Realtime before integration tests. The isolated production TLS/load harness and encrypted local restore rehearsal preserve the working application/data. Hosted capacity, paid recovery features, off-site retention, alert delivery and physical venue acceptance remain [explicit release gates](ACCEPTANCE.md).
