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
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
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
    "/(ru|kk|en)/workspace/:path*",
    "/(ru|kk|en)/organizer/:path*",
    "/(ru|kk|en)/team/:path*",
    "/(ru|kk|en)/draws/:path*",
    "/(ru|kk|en)/matches/:path*",
    "/(ru|kk|en)/hall/:path*",
    "/(ru|kk|en)/corrections/:path*",
    "/(ru|kk|en)/linear-judge/:path*",
    "/(ru|kk|en)/subteam/:path*",
    "/(ru|kk|en)/settings/:path*",
    "/(ru|kk|en)/login",
    "/(ru|kk|en)/forgot-password",
    "/(ru|kk|en)/reset-password",
    "/settings/:path*",
    "/auth/:path*",
    "/api/staff/:path*",
    "/api/scoring",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
