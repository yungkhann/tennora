// Explicit operator command. Never derives privilege from email or metadata.
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const target = process.argv[2];
if (
  !target ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    target,
  )
)
  throw new Error(
    "Usage: node scripts/bootstrap-organizer.mjs <existing-auth-user-uuid>",
  );
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret)
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SECRET_KEY.",
  );
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await client.rpc("bootstrap_organizer", { target });
if (error) {
  process.stderr.write("Bootstrap refused: " + error.message + "\n");
  process.exitCode = 1;
} else process.stdout.write("Initial Organizer explicitly provisioned.\n");
