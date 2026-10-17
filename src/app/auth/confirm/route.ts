import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicSupabaseEnv } from "@/lib/env";
import { authRedirect } from "@/lib/auth-response";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    token_hash &&
    (type === "signup" || type === "recovery") &&
    publicSupabaseEnv()
  ) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (!error)
        return authRedirect(
          type === "recovery" ? "/reset-password" : "/dashboard",
        );
    } catch {
      /* Fail closed; do not leak token/provider errors. */
    }
  }
  return authRedirect("/login?error=callback");
}
