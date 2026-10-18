import { z } from "zod";
import { publicMatch } from "@/features/public/data";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params,
    headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
  if (!z.uuid().safeParse(matchId).success)
    return Response.json({ error: "not_found" }, { status: 404, headers });
  try {
    const data = await publicMatch(matchId);
    return data
      ? Response.json(data, {
          headers: {
            ...headers,
            "Cache-Control": new URL(request.url).searchParams.has("fresh")
              ? "no-store"
              : "public, max-age=0, s-maxage=1",
          },
        })
      : Response.json({ error: "not_found" }, { status: 404, headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
