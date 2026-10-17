# Tennora engineering guide

The user authorized sequential implementation of the single-league table tennis plan. Read docs/IMPLEMENTATION_PLAN.md for current task/status and docs/TABLE_TENNIS_IMPLEMENTATION_PLAN.md for milestone gates. Read docs/DECISIONS.md before implementing an unsettled rule; complete independent work while the affected decision is pending.

- For product/domain changes read docs/PRODUCT_SPEC.md and docs/REQUIREMENTS_REVISED.md. For authorization, transport or deployment changes read docs/ARCHITECTURE.md. For migrations/policies read docs/DATABASE.md; for routing/localization read docs/ROUTES.md.
- Business requests use the verified user's Supabase client. RLS/RPCs independently enforce active staff role, trainer team scope and judge table/day assignment; actor and authority never come from submitted metadata.
- Only Organizer-authorized Auth provisioning/reset/deactivation may use an isolated server-only admin client. Keep its secret out of public variables, returned values and browser bundles.
- Preserve original organizations and audit history until an additive transition is verified. Players have no Auth account. Legacy organization ownership grants no league staff role.
- Validate mutations with Zod; keep pure domain logic testable. PostgreSQL commits authoritative scoring/result/Elo/audit changes atomically, and TypeScript/SQL transition parity is a required gate.
- Per batch: record exact files/migrations, implement, run typecheck/lint/relevant tests/build, review direct-API permissions and responsive states, record verified results and create one focused commit. Mark only verified deliverables complete.
- Production screens use real data or explicit empty/setup states. Public responses/events expose only approved projections; private sessions and snapshots are no-store.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
