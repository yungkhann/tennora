# Tennora engineering guide

Read docs/IMPLEMENTATION_PLAN.md before changing scope; the current authorized milestone is Phase 1 only. Read docs/ARCHITECTURE.md for auth, data access or deployment changes, docs/DATABASE.md for schema/policy changes, and docs/ROUTES.md for routing changes.

- Treat tenant IDs and roles from forms, URLs and user metadata as untrusted. Verify identity server-side and let PostgreSQL RLS enforce membership.
- Use the request-scoped Supabase client with the public key. Server secrets belong only in local tooling; never in application code or NEXT_PUBLIC variables.
- Keep domain logic pure. Validate mutation inputs with Zod; reauthorize every Server Action independently of layouts.
- Change schema through reviewed migrations. Include executable database permission tests for each policy change.
- Keep production screens connected to real data or explicit empty/setup states. Future features belong in the plan rather than inert UI controls.
- For each coherent milestone, identify files and migrations, implement, run typecheck/lint/relevant tests/build, review permissions and responsive states, document actual results, and create one focused Git commit. Distinguish implemented, verified and externally blocked work.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
