import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { z } from "zod";
export const loadFixtureSchema = z.object({
  actor: z.uuid(),
  season: z.uuid(),
  tour: z.uuid(),
  template: z.uuid(),
  token: z.uuid(),
  judges: z.array(z.uuid()),
});
export function localSql(query) {
  try {
    return execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_tennora",
        "psql",
        "-X",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-Atc",
        query,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 32 * 1024 * 1024,
      },
    );
  } catch (error) {
    throw new Error(error.stderr?.toString() || "Local fixture SQL failed");
  }
}
export function cleanupLoadFixture(value) {
  const f = loadFixtureSchema.parse(value);
  const name = localSql(
    `select name from public.seasons where id='${f.season}'`,
  ).trim();
  if (!name) return;
  if (
    name !== `Scale ${f.token}` ||
    localSql(
      `select email from public.staff_accounts where id='${f.actor}'`,
    ).trim() !== `scale-${f.actor}@test.invalid`
  )
    throw new Error("Cleanup refused: fixture identity does not match");
  const clubs = localSql(
      `select team_id from public.season_team_entries where season_id='${f.season}'`,
    )
      .trim()
      .split("\n")
      .filter(Boolean),
    coaches = clubs.map((id) => {
      const hex = createHash("md5")
        .update(`${f.token}-coach-${id}`)
        .digest("hex");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }),
    users = [f.actor, ...coaches, ...f.judges]
      .map(
        (id) =>
          `'${z
            .string()
            .regex(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            )
            .parse(id)}'`,
      )
      .join(","),
    draws = `select d.id from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id='${f.tour}'`,
    matches = `select id from public.team_matches where draw_id in(${draws})`,
    games = `select id from public.singles_games where match_id in(${matches})`,
    players = `select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${f.season}')`;
  localSql(`begin;
delete from public.audit_logs where actor_id in(${users});
delete from public.hall_commands where tour_id='${f.tour}';
delete from public.correction_attempts where request_id in(select id from public.result_correction_requests where game_id in(${games}));
delete from public.result_correction_events where request_id in(select id from public.result_correction_requests where game_id in(${games}));
delete from public.result_correction_states where request_id in(select id from public.result_correction_requests where game_id in(${games}));
delete from public.result_correction_requests where game_id in(${games});
delete from public.active_score_points where game_id in(${games});delete from public.score_events where game_id in(${games});delete from public.game_sets where game_id in(${games});delete from public.player_end_events where game_id in(${games});
delete from public.rating_replay_anchors where player_id in(${players});delete from public.rating_history where player_id in(${players});delete from public.rating_calculation_heads where game_id in(${games});delete from public.rating_calculations where game_id in(${games});
update public.singles_games set result_id=null,result_revision=0 where id in(${games});delete from public.singles_results where game_id in(${games});
delete from public.live_players where match_id in(${matches});delete from public.live_subteams where match_id in(${matches});delete from public.match_table_leases where match_id in(${matches});delete from public.match_commands where match_id in(${matches});delete from public.player_rest_heads where player_id in(${players});
delete from public.table_day_heads where assignment_id in(select id from public.table_judge_assignments where context_tour_id='${f.tour}');delete from public.table_judge_assignments where context_tour_id='${f.tour}';
update public.match_sources set source_result_id=null,source_snapshot_id=null where match_id in(${matches});delete from public.tour_placements where draw_id in(${draws});update public.team_matches set result_id=null,result_revision=0 where id in(${matches});delete from public.team_match_results where match_id in(${matches});
delete from public.group_standing_heads where group_id in(select id from public.stage_groups where draw_id in(${draws}));delete from public.group_standing_snapshots where group_id in(select id from public.stage_groups where draw_id in(${draws}));delete from public.group_tie_draws where group_id in(select id from public.stage_groups where draw_id in(${draws}));
delete from public.lineup_replacements where match_id in(${matches});delete from public.singles_games where match_id in(${matches});delete from public.lineup_slots where lineup_id in(select id from public.lineups where match_id in(${matches}));delete from public.lineups where match_id in(${matches});delete from public.match_sources where match_id in(${matches});delete from public.team_matches where id in(${matches});
delete from public.draw_seed_players where entry_id in(select id from public.draw_entries where draw_id in(${draws}));delete from public.draw_entries where draw_id in(${draws});delete from public.stage_groups where draw_id in(${draws});delete from public.draw_revisions where id in(${draws});delete from public.stages where plan_id in(select id from public.tour_stage_plans where tour_id='${f.tour}');delete from public.tour_stage_plans where tour_id='${f.tour}';
delete from public.season_configuration_snapshots where season_id='${f.season}';delete from public.tournament_settings where tour_id='${f.tour}';delete from public.tours where id='${f.tour}';delete from public.stage_templates where id='${f.template}';delete from public.roster_memberships where season_id='${f.season}';delete from public.players where id in(${players});delete from public.subteam_trainers where trainer_id in(${users});delete from public.trainer_profiles where user_id in(${users});delete from public.subteams where team_id in(select team_id from public.season_team_entries where season_id='${f.season}');delete from public.season_team_entries where season_id='${f.season}';${clubs.length ? `delete from public.teams where id in(${clubs.map((id) => `'${id}'`).join(",")});` : ""}delete from public.seasons where id='${f.season}';delete from public.staff_roles where user_id in(${users});delete from public.staff_accounts where id in(${users});delete from auth.users where id in(${users});commit;`);
}
