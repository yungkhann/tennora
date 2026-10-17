import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params,
    kind = new URL(request.url).searchParams.get("kind") ?? "photo";
  if (
    !uuidSchema.safeParse(assetId).success ||
    !["photo", "evidence"].includes(kind)
  )
    return new Response(null, { status: 404, headers });
  const supabase = await createClient(),
    user = await supabase.auth.getUser();
  if (user.error || !user.data.user)
    return new Response(null, { status: 401, headers });
  const asset = await supabase
    .from("player_photo_assets")
    .select("photo_path,evidence_path,photo_mime,evidence_mime,uploader_id")
    .eq("id", assetId)
    .maybeSingle();
  if (asset.error) return new Response(null, { status: 503, headers });
  if (!asset.data) return new Response(null, { status: 404, headers });
  const isEvidence = kind === "evidence";
  if (isEvidence && asset.data.uploader_id !== user.data.user.id) {
    const role = await supabase
      .from("staff_roles")
      .select("role")
      .eq("user_id", user.data.user.id)
      .eq("role", "organizer")
      .maybeSingle();
    if (role.error || !role.data)
      return new Response(null, { status: 404, headers });
  }
  const result = await supabase.storage
    .from("player-private")
    .download(isEvidence ? asset.data.evidence_path : asset.data.photo_path);
  if (result.error) return new Response(null, { status: 404, headers });
  return new Response(await result.data.arrayBuffer(), {
    headers: {
      ...headers,
      "Content-Type": isEvidence
        ? asset.data.evidence_mime
        : asset.data.photo_mime,
      "Content-Disposition": isEvidence
        ? "attachment; filename=guardian-consent"
        : "inline; filename=private-player-photo",
    },
  });
}
