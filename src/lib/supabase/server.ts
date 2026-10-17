import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";
export async function createClient() {
  const env = publicSupabaseEnv();
  if (!env) throw new Error("Supabase is not configured.");
  const store = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Server Components cannot write cookies; proxy persists refreshes. */
        }
      },
    },
  });
}
