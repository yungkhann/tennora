import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const supabase = await createClient(),
    {
      data: { user },
    } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  const { matchId } = await params;
  if (!z.uuid().safeParse(matchId).success)
    return Response.json({ error: "not_found" }, { status: 404, headers });
  const { data, error } = await supabase.rpc("get_lineup_status", {
    match: matchId,
  });
  if (error)
    return Response.json(
      { error: "unavailable" },
      { status: error.code === "42501" ? 404 : 503, headers },
    );
  return Response.json(data, { headers });
}
