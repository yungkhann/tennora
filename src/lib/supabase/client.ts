"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";
export function createClient() {
  const env = publicSupabaseEnv();
  if (!env) throw new Error("Supabase is not configured.");
  return createBrowserClient<Database>(env.url, env.key);
}
