import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const users = Array.from({ length: 6 }, () => randomUUID()),
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
  async function race(operation) {
    const id = randomUUID(),
      application = `tennora-hall-${token}`;
    const payload = `select public.run_hall_command('${id}','${tour}','${operation}',true);`;
    const first = session(
      `set application_name='${application}';begin;${claims(users[0])}${payload}select pg_sleep(2);commit;`,
    );
    let overlap = false;
    for (let i = 0; i < 50; i++) {
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
    if (!overlap) throw new Error("Hall overlap barrier not reached");
    const began = Date.now(),
      second = session(`begin;${claims(users[0])}${payload}commit;`),
      results = await Promise.all([first, second]),
      elapsed = Date.now() - began;
    if (
      results.some((r) => r.code !== 0) ||
      elapsed < 700 ||
      sql(
        `select count(*) from public.hall_commands where id='${id}'`,
      ).trim() !== "1"
    )
      throw new Error(`Hall ${operation} idempotency race failed`);
    return elapsed;
  }
  const allocated = await race("allocate");
  if (
    sql(
      `select count(*) from public.match_table_leases where match_id='${fixture.match}'`,
    ).trim() !== "1"
  )
    throw new Error("One table reservation required");
  const table = Number(
    sql(
      `select table_number from public.match_table_leases where match_id='${fixture.match}'`,
    ).trim(),
  );
  sql(
    `begin;${claims(users[0])}select public.assign_table_judge('${randomUUID()}','${tour}',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,null,1,true);select public.assign_table_judge('${randomUUID()}','${tour}',${table},(clock_timestamp() at time zone 'Asia/Almaty')::date,'${users[5]}',0,true);commit;`,
  );
  const started = await race("start_all");
  const state = sql(
    `select concat(m.status,':',(select count(*) from public.live_players where match_id=m.id),':',(select count(*) from public.match_commands where match_id=m.id and kind='start')) from public.team_matches m where m.id='${fixture.match}'`,
  ).trim();
  if (state !== "in_progress:10:1")
    throw new Error("Bulk start exact-once resource invariant failed");
  console.log(
    `PASS: allocate/start-all duplicate transactions overlap ${allocated}/${started} ms; one batch receipt, one reservation, one start and ten exclusive player leases.`,
  );
} finally {
  sql(
    `begin;delete from public.hall_commands where tour_id='${tour}';delete from public.audit_logs where actor_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.live_players where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.live_subteams where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_table_leases where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_commands where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.player_rest_heads where player_id in(select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}'));delete from public.table_day_heads where assignment_id in(select id from public.table_judge_assignments where context_tour_id='${tour}');delete from public.table_judge_assignments where context_tour_id='${tour}';delete from public.lineup_replacements where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.singles_games where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.lineup_slots where lineup_id in(select id from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}'));delete from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_sources where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.team_matches where draw_id='${draw}';delete from public.draw_seed_players where entry_id in(select id from public.draw_entries where draw_id='${draw}');delete from public.draw_entries where draw_id='${draw}';delete from public.stage_groups where draw_id='${draw}';delete from public.draw_revisions where id='${draw}';delete from public.stages where plan_id in(select id from public.tour_stage_plans where tour_id='${tour}');delete from public.tour_stage_plans where tour_id='${tour}';delete from public.season_configuration_snapshots where season_id='${season}';delete from public.tournament_settings where tour_id='${tour}';delete from public.tours where id='${tour}';delete from public.stage_templates where id='${template}';delete from public.roster_memberships where season_id='${season}';delete from public.rating_history where player_id in(select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}'));delete from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.subteam_trainers where trainer_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.trainer_profiles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.subteams where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.season_team_entries where season_id='${season}';${clubs.length ? `delete from public.teams where id in(${clubs.map((id) => `'${id}'`).join(",")});` : ""}delete from public.seasons where id='${season}';delete from public.staff_roles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.staff_accounts where id in(${users.map((id) => `'${id}'`).join(",")});delete from auth.users where id in(${users.map((id) => `'${id}'`).join(",")});commit;`,
  );
}
