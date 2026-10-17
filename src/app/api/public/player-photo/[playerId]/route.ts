import { anonymousClient } from "@/lib/supabase/anonymous-server";
import { uuidSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await params;
  if (!uuidSchema.safeParse(playerId).success)
    return new Response(null, { status: 404, headers });
  try {
    const { data, error } = await anonymousClient()
      .from("public_player_photos")
      .select("content_base64")
      .eq("player_id", playerId)
      .maybeSingle();
    if (error) return new Response(null, { status: 503, headers });
    if (!data) return new Response(null, { status: 404, headers });
    return new Response(
      Uint8Array.from(Buffer.from(data.content_base64, "base64")),
      {
        headers: {
          ...headers,
          "Content-Type": "image/jpeg",
          "Content-Disposition": "inline; filename=player-photo.jpg",
        },
      },
    );
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
