// Explicit operator-only first-account setup. No password is generated or stored.
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error("Usage: node scripts/invite-first-organizer.mjs <email>");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret)
  throw new Error("Configure Supabase URL and server-only Auth secret.");
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const result = await client.auth.admin.inviteUserByEmail(email, {
  data: { display_name: "Organizer" },
});
if (result.error || !result.data.user)
  throw new Error(
    "Invitation failed. Inspect the Auth operator console; no password was created.",
  );
const { error } = await client.rpc("bootstrap_organizer", {
  target: result.data.user.id,
});
if (error)
  throw new Error(
    "Auth invitation created, but Organizer bootstrap refused. Existing Organizer authority is unchanged.",
  );
console.log(
  "First Organizer granted through trusted bootstrap. Complete email verification and password setup using the invitation.",
);
if (["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  console.log(
    "Local delivery: open Mailpit at http://127.0.0.1:54324. No Gmail delivery is performed by the local stack.",
  );
