import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicSupabaseEnv } from "@/lib/env";
export async function proxy(request: NextRequest) {
  const env = publicSupabaseEnv();
  let response = NextResponse.next({ request });
  const noStore = () => {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  };
  noStore();
  if (!env) return response;
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        noStore();
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/auth/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
