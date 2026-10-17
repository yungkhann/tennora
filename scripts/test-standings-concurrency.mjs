import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const users = Array.from({ length: 3 }, () => randomUUID()),
  season = randomUUID(),
  tour = randomUUID(),
  template = randomUUID(),
  draw = randomUUID(),
  token = randomUUID().slice(0, 8);
function sql(query) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_tennora",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atc",
      query,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}
function session(query) {
  const proc = spawn("docker", [
    "exec",
    "-i",
    "supabase_db_tennora",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    query,
  ]);
  let error = "";
  proc.stdout.resume();
  proc.stderr.on("data", (data) => (error += data));
  return new Promise((resolve) =>
    proc.on("close", (code) => resolve({ code, error })),
  );
}
const claims = (actor) =>
  `set local role authenticated;select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);`;
let clubs = [];
try {
  const source = readFileSync(
    new URL("../supabase/tests/009_standings.sql", import.meta.url),
    "utf8",
  );
  let setup = source
    .slice(0, source.indexOf("-- STANDINGS_RACE_FIXTURE_END"))
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("select no_plan") &&
        !line.startsWith("create extension") &&
        !/^select (is|ok|throws_ok)\(/.test(line),
    )
    .join("\n");
  for (let i = 0; i < 3; i++)
    setup = setup.replaceAll(
      `aaaa9000-0000-4000-8000-00000000000${i + 1}`,
      users[i],
    );
  for (const [before, after] of [
    ["bbbb9000-0000-4000-8000-000000000001", season],
    ["cccc9000-0000-4000-8000-000000000001", tour],
    ["dddd9000-0000-4000-8000-000000000001", template],
    ["eeee9000-0000-4000-8000-000000000001", draw],
  ])
    setup = setup.replaceAll(before, after);
  setup = setup
    .replace(
      "where id::text like 'aaaa9000-%'",
      `where id in(${users.map((id) => `'${id}'`).join(",")})`,
    )
    .replaceAll("@test.invalid", `-${token}@test.invalid`);
  sql(setup + "reset role;commit;");
  clubs = sql(
    `select team_id from public.season_team_entries where season_id='${season}'`,
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const group = sql(
    `select id from public.stage_groups where draw_id='${draw}' and label='A'`,
  ).trim();
  const application = `tennora-standings-race-${token}`;
  const first = session(
    `set application_name='${application}';begin;${claims(users[0])}select public.draw_group_ties('${group}',2);select pg_sleep(2);commit;`,
  );
  let overlap = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      sql(
        `select count(*) from pg_stat_activity where application_name='${application}' and wait_event='PgSleep'`,
      ).trim() === "1"
    ) {
      overlap = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!overlap) throw new Error("Tie draw overlap barrier not reached");
  const began = Date.now();
  const second = session(
    `begin;${claims(users[0])}select public.draw_group_ties('${group}',2);commit;`,
  );
  const [a, b] = await Promise.all([first, second]),
    blocked = Date.now() - began;
  if (a.code !== 0 || b.code !== 0 || blocked < 700)
    throw new Error("Concurrent tie draws did not serialize");
  const state = sql(
    `select concat((select count(*) from public.group_tie_draws where group_id='${group}'),':',(select count(*) from public.group_standing_snapshots where group_id='${group}'),':',(select count(*) from public.audit_logs where action='standings.tie_drawn' and after_state->>'group_id'='${group}'))`,
  ).trim();
  if (state !== "1:3:1")
    throw new Error("Duplicate random receipt, final snapshot or audit");
  console.log(
    `PASS: tie draw requests overlap ${blocked} ms; one random receipt, one final snapshot and one audit.`,
  );
} finally {
  sql(
    `begin;delete from public.audit_logs where actor_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.lineup_replacements where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.singles_games where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.lineup_slots where lineup_id in(select id from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}'));delete from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_sources where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.tour_placements where draw_id='${draw}';delete from public.group_standing_heads where group_id in(select id from public.stage_groups where draw_id='${draw}');delete from public.group_standing_snapshots where group_id in(select id from public.stage_groups where draw_id='${draw}');delete from public.group_tie_draws where group_id in(select id from public.stage_groups where draw_id='${draw}');update public.team_matches set result_id=null,result_revision=0 where draw_id='${draw}';delete from public.team_match_results where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.team_matches where draw_id='${draw}';delete from public.draw_seed_players where entry_id in(select id from public.draw_entries where draw_id='${draw}');delete from public.draw_entries where draw_id='${draw}';delete from public.stage_groups where draw_id='${draw}';delete from public.draw_revisions where id='${draw}';delete from public.stages where plan_id in(select id from public.tour_stage_plans where tour_id='${tour}');delete from public.tour_stage_plans where tour_id='${tour}';delete from public.season_configuration_snapshots where season_id='${season}';delete from public.tournament_settings where tour_id='${tour}';delete from public.tours where id='${tour}';delete from public.stage_templates where id='${template}';delete from public.roster_memberships where season_id='${season}';delete from public.rating_history where player_id in(select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}'));delete from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.subteam_trainers where trainer_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.trainer_profiles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.subteams where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.season_team_entries where season_id='${season}';${clubs.length ? `delete from public.teams where id in(${clubs.map((id) => `'${id}'`).join(",")});` : ""}delete from public.seasons where id='${season}';delete from public.staff_roles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.staff_accounts where id in(${users.map((id) => `'${id}'`).join(",")});delete from auth.users where id in(${users.map((id) => `'${id}'`).join(",")});commit;`,
  );
}
