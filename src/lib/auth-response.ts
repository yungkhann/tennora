import { NextResponse } from "next/server";

// Relative Location preserves the browser origin behind local or hosting proxies.
// Callers supply only fixed paths or a destination validated by safeNext().
export function authRedirect(destination: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "private, no-store" },
  });
}
