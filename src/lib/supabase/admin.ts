import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
// Expose only Auth administration: this client cannot become a business-data bypass.
export function authAdmin() {
  const env = publicSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!env || !secret)
    throw new Error("Staff Auth administration is not configured.");
  return createClient(env.url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }).auth.admin;
}
