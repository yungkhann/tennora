import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";
export function anonymousClient() {
  const env = publicSupabaseEnv();
  if (!env) throw new Error("Supabase is not configured");
  return createClient<Database>(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
