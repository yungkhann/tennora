# Task A - rebaseline verification

17 October 2026. No application or database migration changes in this batch.

## Delivered

- Replaced active product/architecture/database/routes documents with the single-league Next.js/Supabase target, explicitly distinguishing target behavior from the current Phase 1 implementation.
- Preserved the previous five planning documents in docs/archive. Updated AGENTS.md and the active implementation ledger for authorized sequential execution.
- Added DECISIONS.md: confirmed stack, scope, no player accounts, three locales and coexisting staff roles. D02-D10 remain explicit dependencies for later tasks; D01 is resolved.
- Added REQUIREMENTS_REVISED.md and a reproducible ReportLab PDF builder with pinned artifact dependencies. Created an 11-page revised PDF under output/pdf. Original source PDF is unchanged and excluded from the commit.
- Preserved FR-1 through FR-18, team/individual scoring rules and operational acceptance targets; identified architecture/transport/password/deployment changes and unresolved rules explicitly.

## Checks

- Revised PDF generated successfully and reopened with PyMuPDF; all 18 functional requirement IDs found.
- All PDF text blocks stay within page bounds. Rendered all 11 pages and inspected both full-document contact sheets plus detailed pages 1, 10 and 11; repeated table headers, line wrapping, footer numbering and the final decisions section are legible and unclipped.
- Original PDF SHA-256: `ec19b24fe3906f83486735726c3ffc19e137e7f11b0b11fedb609266da62cf68`. This is a preservation reference; the original remains the user's untracked input.
- Existing production build passes. A first parallel typecheck/build attempt raced on generated .next/types files; checks were rerun sequentially without source changes.
- Final typecheck, zero-warning lint, 33 Vitest checks, Markdown formatting and diff whitespace checks pass. No new behavior tests were added for this documentation-only batch.

## Limits and next task

This batch defines requirements and permissions; it does not implement staff roles or any league operation. Provider recovery/latency targets are not tested here. Task B proceeds next with its own file/migration inventory and real Auth/RLS/cookie checks. Dependent competition behavior remains gated on DECISIONS.md rather than invented defaults.
