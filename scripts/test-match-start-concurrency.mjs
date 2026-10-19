import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const users = Array.from({ length: 6 }, () => randomUUID()),
  season = randomUUID(),
  tour = randomUUID(),
  template = randomUUID(),
  draw = randomUUID(),
  startA = randomUUID(),
  startB = randomUUID(),
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
let fixture,
  clubs = [];
try {
  const source = readFileSync(
    new URL("../supabase/tests/014_match_lifecycle.sql", import.meta.url),
    "utf8",
  );
  let setup = source
    .slice(0, source.indexOf("-- MATCH_START_FIXTURE_END"))
    .replace("select no_plan();", "");
  for (let i = 0; i < 6; i++)
    setup = setup.replaceAll(
      `aaaae2b0-0000-4000-8000-00000000000${i + 1}`,
      users[i],
    );
  for (const [before, after] of [
    ["bbbbe2b0-0000-4000-8000-000000000001", season],
    ["cccce2b0-0000-4000-8000-000000000001", tour],
    ["dddde2b0-0000-4000-8000-000000000001", template],
    ["eeeee2b0-0000-4000-8000-000000000001", draw],
    ...[1, 2, 3].map((i) => [
      `ffffe2b0-0000-4000-8000-00000000000${i}`,
      randomUUID(),
    ]),
  ])
    setup = setup.replaceAll(before, after);
  setup = setup
    .replace(
      "where id::text like 'aaaae2b0-%'",
      `where id in(${users.map((id) => `'${id}'`).join(",")})`,
    )
    .replaceAll("@test.invalid", `-${token}@test.invalid`);
  const output = sql(
    setup + "select row_to_json(f) from lineup_fixture f;commit;",
  );
  fixture = JSON.parse(
    output.split("\n").find((line) => line.startsWith('{"match":')),
  );
  clubs = sql(
    `select team_id from public.season_team_entries where season_id='${season}'`,
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  sql(
    `begin;${claims(users[0])}select public.manage_match('${randomUUID()}','${fixture.match}','assign',127,2,true);select public.manage_match('${randomUUID()}','${fixture.match}','call',null,3,true);commit;`,
  );
  const application = `tennora-match-start-${token}`;
  const payload = (id) =>
    `select public.manage_match('${id}','${fixture.match}','start',null,4,true);`;
  const first = session(
    `set application_name='${application}';begin;${claims(users[0])}${payload(startA)}select pg_sleep(2);commit;`,
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
  if (!overlap) throw new Error("Match start overlap barrier not reached");
  const began = Date.now();
  const second = session(`begin;${claims(users[0])}${payload(startB)}commit;`);
  const [a, b] = await Promise.all([first, second]),
    blocked = Date.now() - began;
  if (
    a.code !== 0 ||
    b.code === 0 ||
    !b.error.includes("Match version conflict") ||
    blocked < 700
  )
    throw new Error("Concurrent match starts failed");
  const state = sql(
    `select concat(status,':',version,':',(select count(*) from public.live_subteams where match_id='${fixture.match}'),':',(select count(*) from public.live_players where match_id='${fixture.match}'),':',(select count(*) from public.match_commands where match_id='${fixture.match}' and kind='start')) from public.team_matches where id='${fixture.match}'`,
  ).trim();
  if (state !== "in_progress:5:2:10:1")
    throw new Error("One-start resource invariant failed");
  sql(`begin;${claims(users[0])}${payload(startA)}commit;`);
  console.log(
    `PASS: starts overlap ${blocked} ms; one start, two subteam and ten player leases; stale contender rejected and exact retry unchanged.`,
  );
} finally {
  sql(
    `begin;delete from public.audit_logs where actor_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.live_players where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.live_subteams where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_table_leases where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_commands where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.player_rest_heads where player_id in(select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}'));delete from public.table_day_heads where assignment_id in(select id from public.table_judge_assignments where context_tour_id='${tour}');delete from public.table_judge_assignments where context_tour_id='${tour}';delete from public.lineup_replacements where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.singles_games where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.lineup_slots where lineup_id in(select id from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}'));delete from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_sources where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.team_matches where draw_id='${draw}';delete from public.draw_seed_players where entry_id in(select id from public.draw_entries where draw_id='${draw}');delete from public.draw_entries where draw_id='${draw}';delete from public.stage_groups where draw_id='${draw}';delete from public.draw_revisions where id='${draw}';delete from public.stages where plan_id in(select id from public.tour_stage_plans where tour_id='${tour}');delete from public.tour_stage_plans where tour_id='${tour}';delete from public.season_configuration_snapshots where season_id='${season}';delete from public.tournament_settings where tour_id='${tour}';delete from public.tours where id='${tour}';delete from public.stage_templates where id='${template}';delete from public.roster_memberships where season_id='${season}';delete from public.rating_history where player_id in(select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}'));delete from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.subteam_trainers where trainer_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.trainer_profiles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.subteams where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.season_team_entries where season_id='${season}';${clubs.length ? `delete from public.teams where id in(${clubs.map((id) => `'${id}'`).join(",")});` : ""}delete from public.seasons where id='${season}';delete from public.staff_roles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.staff_accounts where id in(${users.map((id) => `'${id}'`).join(",")});delete from auth.users where id in(${users.map((id) => `'${id}'`).join(",")});commit;`,
  );
}
