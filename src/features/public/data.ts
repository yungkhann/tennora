import "server-only";
import { cache } from "react";
import { anonymousClient } from "@/lib/supabase/anonymous-server";
import { publicSupabaseEnv } from "@/lib/env";
import {
  directorySchema,
  publicPlayerSchema,
  publicRowSchema,
  historySchema,
  seasonStandingSchema,
} from "./validation";
export const publicDirectory = cache(async () => {
  if (!publicSupabaseEnv()) return { seasons: [], tours: [], draws: [] };
  const r = await anonymousClient().rpc("get_public_directory");
  if (r.error) throw new Error("Public directory unavailable");
  return directorySchema.parse(r.data);
});
export const publicPlayers = cache(async () => {
  if (!publicSupabaseEnv()) return [];
  // Fetch every approved row in stable order; a global cap could omit one gender.
  const players = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await anonymousClient()
      .from("public_league_players")
      .select(
        "id,first_name,last_name,rating,team_id,team_name,age_group,has_photo,gender",
      )
      .order("rating", { ascending: false })
      .order("last_name")
      .order("id")
      .range(offset, offset + 999);
    if (r.error) throw new Error("Public ranking unavailable");
    const batch = publicPlayerSchema.array().parse(r.data);
    players.push(...batch);
    if (batch.length < 1000) return players;
  }
});
export const publicPlayer = cache(async (id: string) => {
  if (!publicSupabaseEnv()) return null;
  const r = await anonymousClient().rpc("get_public_player", { player: id });
  if (r.error) throw new Error("Public player unavailable");
  return r.data === null ? null : publicPlayerSchema.parse(r.data);
});
export async function publicMatches(tour?: string) {
  if (!publicSupabaseEnv()) return [];
  let q = anonymousClient()
    .from("public_match_snapshots")
    .select("match_id,tour_id,version,data,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (tour) q = q.eq("tour_id", tour);
  else q = q.in("data->>status", ["called", "in_progress"]);
  const r = await q;
  if (r.error) throw new Error("Public scores unavailable");
  return publicRowSchema.array().parse(r.data);
}
export async function publicMatch(id: string) {
  const r = await anonymousClient()
    .from("public_match_snapshots")
    .select("match_id,tour_id,version,data,updated_at")
    .eq("match_id", id)
    .maybeSingle();
  if (r.error) throw new Error("Public match unavailable");
  return r.data ? publicRowSchema.parse(r.data) : null;
}
export async function playerHistory(player: string) {
  const r = await anonymousClient().rpc("get_public_player_history", {
    player,
  });
  if (r.error) throw new Error("Public history unavailable");
  return historySchema.parse(r.data);
}
export async function seasonStandings(season: string) {
  const r = await anonymousClient().rpc("get_public_season_standings", {
    season,
  });
  if (r.error) throw new Error("Public standings unavailable");
  return seasonStandingSchema.parse(r.data);
}
