"use client";
import { createClient as createAnonymousClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";
export function createClient() {
  const env = publicSupabaseEnv();
  if (!env) throw new Error("Supabase is not configured.");
  return createAnonymousClient<Database>(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
