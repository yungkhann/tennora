import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const users = Array.from({ length: 5 }, () => randomUUID()),
  season = randomUUID(),
  tour = randomUUID(),
  template = randomUUID(),
  draw = randomUUID(),
  lineupA = randomUUID(),
  lineupB = randomUUID(),
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
  // Reuse the SQL suite's domain fixture, before any assertions. All persistent
  // identities/emails are randomized, and the temporary carrier table dies here.
  const source = readFileSync(
    new URL("../supabase/tests/008_lineups.sql", import.meta.url),
    "utf8",
  );
  let setup = source
    .slice(0, source.indexOf("-- LINEUP_FIXTURE_END"))
    .replace("select no_plan();", "");
  for (let i = 0; i < 5; i++)
    setup = setup.replaceAll(
      `aaaa8000-0000-4000-8000-00000000000${i + 1}`,
      users[i],
    );
  for (const [before, after] of [
    ["bbbb8000-0000-4000-8000-000000000001", season],
    ["cccc8000-0000-4000-8000-000000000001", tour],
    ["dddd8000-0000-4000-8000-000000000001", template],
    ["eeee8000-0000-4000-8000-000000000001", draw],
  ])
    setup = setup.replaceAll(before, after);
  setup = setup.replace(
    "where id::text like 'aaaa8000-%'",
    `where id in(${users.map((id) => `'${id}'`).join(",")})`,
  );
  setup = setup.replaceAll("@test.invalid", `-${token}@test.invalid`);
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
  const payload = (id, subteam, players) =>
    `select public.submit_lineup('${id}','${fixture.match}','${subteam}',array[${players.map((p) => `'${p}'::uuid`).join(",")}]);`;
  const application = `tennora-lineup-race-${token}`;
  const first = session(
    `set application_name='${application}';begin;${claims(users[2])}${payload(lineupA, fixture.subteam_a, fixture.players_a)}select pg_sleep(2);commit;`,
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
  if (!overlap) throw new Error("No held-submission barrier");
  const began = Date.now(),
    second = session(
      `begin;${claims(users[3])}${payload(lineupB, fixture.subteam_b, fixture.players_b)}commit;`,
    ),
    [a, b] = await Promise.all([first, second]),
    blocked = Date.now() - began;
  if (a.code !== 0 || b.code !== 0 || blocked < 700)
    throw new Error("Concurrent submissions failed");
  const state = sql(
    `select concat((select count(*) from public.lineups where match_id='${fixture.match}'),':',(select count(*) from public.singles_games where match_id='${fixture.match}'),':',lineup_version,':',lineups_reveal_version,':',(select count(*) from public.audit_logs where action='lineups.revealed' and entity_id='${fixture.match}')) from public.team_matches where id='${fixture.match}';`,
  ).trim();
  if (state !== "2:5:2:2:1")
    throw new Error("Joint reveal/count invariant failed");
  sql(
    `begin;${claims(users[2])}${payload(lineupA, fixture.subteam_a, fixture.players_a)}commit;`,
  );
  if (
    sql(
      `select lineup_version from public.team_matches where id='${fixture.match}'`,
    ).trim() !== "2"
  )
    throw new Error("Retry changed reveal version");
  console.log(
    `PASS: submissions overlap ${blocked} ms; both commit, exactly five singles and one reveal; duplicate receipt is unchanged.`,
  );
} finally {
  sql(
    `begin;delete from public.audit_logs where actor_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.lineup_replacements where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.singles_games where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.lineup_slots where lineup_id in(select id from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}'));delete from public.lineups where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.match_sources where match_id in(select id from public.team_matches where draw_id='${draw}');delete from public.team_matches where draw_id='${draw}';delete from public.draw_seed_players where entry_id in(select id from public.draw_entries where draw_id='${draw}');delete from public.draw_entries where draw_id='${draw}';delete from public.stage_groups where draw_id='${draw}';delete from public.draw_revisions where id='${draw}';delete from public.stages where plan_id in(select id from public.tour_stage_plans where tour_id='${tour}');delete from public.tour_stage_plans where tour_id='${tour}';delete from public.season_configuration_snapshots where season_id='${season}';delete from public.tournament_settings where tour_id='${tour}';delete from public.tours where id='${tour}';delete from public.stage_templates where id='${template}';delete from public.roster_memberships where season_id='${season}';delete from public.rating_history where player_id in(select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}'));delete from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.subteam_trainers where trainer_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.trainer_profiles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.subteams where team_id in(select team_id from public.season_team_entries where season_id='${season}');delete from public.season_team_entries where season_id='${season}';${clubs.length ? `delete from public.teams where id in(${clubs.map((id) => `'${id}'`).join(",")});` : ""}delete from public.seasons where id='${season}';delete from public.staff_roles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.staff_accounts where id in(${users.map((id) => `'${id}'`).join(",")});delete from auth.users where id in(${users.map((id) => `'${id}'`).join(",")});commit;`,
  );
}
