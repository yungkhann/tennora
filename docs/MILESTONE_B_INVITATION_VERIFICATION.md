# First Organizer invitation follow-up

17 October 2026. User explicitly selected the initial Organizer identity and required normal password setup without hardcoded credentials or authentication bypass.

Files: `scripts/invite-first-organizer.mjs`, `supabase/templates/invite.html`, `supabase/config.toml`, `src/app/auth/confirm/route.ts`, the Auth/public browser tests and the staff SQL test, plus setup/evidence documentation.

The trusted operator script asks Supabase Auth to invite the supplied email without a password, then grants the returned identity the first Organizer role through the existing service-only bootstrap RPC. The application accepts only invite/recovery OTP types, verifies the token with Auth and routes the verified staff session to password setup. Public signup remains disabled; arbitrary signup confirmations stay rejected. Staff provisioning for subsequent users still supports Organizer-supplied initial passwords as documented in B.

A real browser fixture proves unconfirmed invitation -> email verification -> self-chosen password -> login, HTTP-only refresh, subsequent staff provisioning, recovery, deactivation and logout. The initial fixture has no confirmed email until the invitation is verified. No Auth token/password is printed or checked into files.

The requested actual Organizer account was created only after that test passed. Its invitation was left unused for the user. The local Auth service delivers to Mailpit, not Gmail or another external mailbox; open http://127.0.0.1:54324 and the message titled “Set up your Tennora staff account.” Hosted SMTP delivery is not claimed. No database reset was used.

Tests now remain usable with a real local Organizer present: the first-Organizer SQL proof isolates existing active staff only within its rolled-back transaction and scopes fixture counts; browser tests explicitly seed disposable roles instead of invoking first-account bootstrap. Other database connections retain committed account state. First-account bootstrap remains independently checked for service-only access and refusal after an active Organizer exists.
