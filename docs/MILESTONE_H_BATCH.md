# H — operational readiness inventory

G is complete in 63ddf9f. This operational batch implements independent local work and records failing/external gates without claiming release acceptance.

Exact files:

- Database: `supabase/migrations/202610180014_operational_health.sql`, `supabase/tests/023_operational_health.sql`, `src/lib/supabase/database.types.ts`.
- Runtime: `src/app/api/health/route.ts`, `src/app/api/scoring/route.ts`, `src/lib/observability.ts`, `src/instrumentation.ts`, `next.config.ts`.
- Tooling: `.github/workflows/ci.yml`, `.gitignore`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json`, `package.json`; `scripts/test-hall-scale.mjs`, `scripts/serve-local-production.mjs`, `scripts/test-load-local.mjs`, `scripts/test-restore.mjs`, `scripts/check-release.mjs`, `scripts/check-browser-secrets.mjs`, `scripts/lib/histogram.mjs`, `scripts/lib/local-fixture-cleanup.mjs`, `scripts/lib/release-evidence.mjs`.
- Tests: `tests/unit/readiness.test.ts`, `tests/e2e/health.spec.ts`.
- Documentation: `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/ROUTES.md`, `docs/IMPLEMENTATION_PLAN.md`, this inventory, `docs/MILESTONE_H_VERIFICATION.md`, `docs/RUNBOOK.md`, `docs/ACCEPTANCE.md`.
- Sanitized evidence: `output/readiness/local-restore.json`, `output/readiness/local-load-25.json`, `output/readiness/local-load-100.json`, `output/readiness/local-load-2000.json`.

Real backend/browser checks run after Auth/Storage/Realtime setup. Operational responses expose only clocks, redacted transport timing/status and request IDs. Encrypted local database/Storage backup is restored into isolated targets and reconciled for data, Auth, policy/function definitions, ownership, ACLs/RLS and object bytes. Disposable loopback traffic records both a successful smoke and failing service-capacity gates. Release preflight fails without provider/privacy/PITR/off-site-retention/latency/venue/alerts/cutover evidence. Hosted credentials, purchased recovery features and physical venue measurements remain external facts.
