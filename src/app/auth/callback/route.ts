import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicSupabaseEnv } from "@/lib/env";
import { safeNext } from "@/lib/redirects";
import { authRedirect } from "@/lib/auth-response";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && publicSupabaseEnv()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error)
        return authRedirect(safeNext(request.nextUrl.searchParams.get("next")));
    } catch {
      /* Invalid tokens and connectivity errors both fail closed. */
    }
  }
  return authRedirect("/ru/login?error=callback");
}
