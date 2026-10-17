import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
export const lineupStatusSchema = z.object({
  sources_ready: z.boolean(),
  match_id: z.uuid(),
  version: z.number().int(),
  lineup_version: z.number().int(),
  revealed: z.boolean(),
  reveal_version: z.number().int().nullable(),
  a_submitted: z.boolean(),
  b_submitted: z.boolean(),
});
export async function requireLineupMatch(locale: string, id: string) {
  const staff = await requireStaff(locale);
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: match, error } = await staff.supabase
    .from("team_matches")
    .select(
      "id,status,subteam_a,subteam_b,draw_revisions(published_at,tour_stage_plans(age_group,tours(name,season_id,seasons(year))))",
    )
    .eq("id", id)
    .single();
  if (
    error ||
    !match ||
    !match.subteam_a ||
    !match.subteam_b ||
    !match.draw_revisions.published_at
  )
    notFound();
  const result = await staff.supabase.rpc("get_lineup_status", { match: id }),
    status = lineupStatusSchema.safeParse(result.data);
  if (result.error || !status.success) notFound();
  const namesResult = await staff.supabase.rpc("lineup_match_names", {
    matches: [id],
  });
  const a = namesResult.data?.find((v) => v.side === "a"),
    b = namesResult.data?.find((v) => v.side === "b");
  if (namesResult.error || !a || !b) notFound();
  const coached = staff.roles.includes("trainer")
    ? await staff.supabase
        .from("subteam_trainers")
        .select("subteam_id")
        .eq("trainer_id", staff.user.id)
    : null;
  if (coached?.error) throw new Error("Could not verify Trainer assignment.");
  const own = (coached?.data ?? []).map((v) => v.subteam_id);
  return {
    ...staff,
    match,
    status: status.data,
    season: match.draw_revisions.tour_stage_plans.tours.season_id,
    year: match.draw_revisions.tour_stage_plans.tours.seasons.year,
    age: match.draw_revisions.tour_stage_plans.age_group,
    tourName: match.draw_revisions.tour_stage_plans.tours.name,
    official: staff.roles.some((r) => r === "organizer" || r === "main_judge"),
    teams: [
      {
        id: match.subteam_a,
        club: a.club_id,
        name: a.name,
        own: own.includes(match.subteam_a),
      },
      {
        id: match.subteam_b,
        club: b.club_id,
        name: b.name,
        own: own.includes(match.subteam_b),
      },
    ],
  };
}
