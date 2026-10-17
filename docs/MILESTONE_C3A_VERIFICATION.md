# C3a — private photos and guardian consent

17 October 2026. Part of Task C. Settings, stages and season-start readiness remain C3b.

## Delivered

Migrations 009–011, private Storage policies, hash/path-bound upload receipts, localized Trainer upload and Organizer review controls, and public/private photo endpoints implement C09. Original photos and written guardian-consent evidence stay in the private `player-private` bucket. Uploaders confirm consent; only an Organizer approves, rejects or revokes publication. Actor, reason, time and state changes are audited. Ordinary staff cannot overwrite or delete originals/evidence.

The approval action downloads with the reviewer's JWT, verifies both stored hashes and formats, then creates a small metadata-free JPEG. Approval and the public projection/audit commit together. Revocation removes that projection transactionally; subsequent anonymous fetches return 404. Public delivery uses an anonymous client and never reads originals or consent evidence. Already delivered bytes cannot be recalled. Public pages/Realtime notifications remain Task G.

Uploads accept JPEG/PNG/WebP, with PDF also allowed for private evidence attachments. Each file is at most 2 MiB; image decoding is limited to 16 million pixels and one page. Published JPEGs are at most 512 pixels per edge and 256 KiB. Sharp's metadata defaults, pixel limits and auto-orientation were checked against its [output](https://sharp.pixelplumbing.com/api-output/), [constructor](https://sharp.pixelplumbing.com/api-constructor/) and [operation](https://sharp.pixelplumbing.com/api-operation/) documentation. The 5 MB Server Action limit accommodates both files; the selected 4 MiB combined file cap leaves room beneath Netlify's documented 4.5 MB effective binary request limit. Hosted multipart/adapter behavior remains to be measured. See [Netlify function limits](https://docs.netlify.com/build/functions/configuration/).

## Evidence

- Typecheck, zero-warning lint, 60 unit tests and the final production build pass.
- 211 pgTAP assertions pass against the existing local database and a separate fresh Supabase project with all eleven migrations. The original database was not reset. The temporary project was stopped after testing.
- Fourteen desktop/mobile browser cases plus the separate real Auth/invitation/session case pass. Photo tests send two exact 2 MiB files through the real Server Action and Storage, check pending/public denial, private evidence permissions, Organizer approval, sanitized JPEG delivery, revocation and retained private history.
- Direct API tests deny anonymous Storage downloads both before and after approval. An unrelated Trainer in the same club cannot download another uploader's consent evidence. Anonymous private-route requests return 401; private/public delivery is no-store. SQL tests independently deny unauthorized publication and direct writes, and verify audit, superseding and revocation.
- Desktop and mobile review screenshots were captured and visually inspected. Fields, consent controls and actions remain readable, and browser checks find no horizontal overflow. Fixtures use synthetic images/PDFs, and their Auth/database/Storage records are cleaned up. No real minors' data was seeded.

## Limits

Local Storage is healthy and the real first Organizer account/invitation is preserved. This is local integration evidence, not hosted release readiness. Native Sharp packaging, function memory, maximum multipart payloads and production Storage policies require staging verification. At the maximum projection size, 360 photos use about 90 MiB of JPEG bytes (about 120 MiB base64 before row/index overhead); provider storage/traffic budgets must be measured in H.

Private Storage bytes need their own backup and restore proof; a database-only backup is insufficient. The two private uploads and receipt form a retryable workflow rather than a cross-service atomic transaction. Database approval/revocation/projection/audit are atomic. K/settings, stage templates, start readiness and subsequent tournament operations are not claimed by this batch.
