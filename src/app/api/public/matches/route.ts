import { z } from "zod";
import { publicMatches } from "@/features/public/data";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams,
    tour = params.get("tour");
  if (tour && !z.uuid().safeParse(tour).success)
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  try {
    return Response.json(await publicMatches(tour ?? undefined), {
      headers: {
        "Cache-Control": params.has("fresh")
          ? "no-store"
          : "public, max-age=0, s-maxage=1",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
