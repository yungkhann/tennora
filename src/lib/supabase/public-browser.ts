"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";
let client: SupabaseClient<Database> | null = null;
export function publicBrowserClient() {
  if (client) return client;
  const env = publicSupabaseEnv();
  if (!env) return null;
  client = createClient<Database>(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "tennora-public-anonymous",
    },
    realtime: {
      heartbeatIntervalMs: 20000,
      reconnectAfterMs: (attempt) =>
        Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)) +
        Math.floor(Math.random() * 300),
    },
  });
  return client;
}
