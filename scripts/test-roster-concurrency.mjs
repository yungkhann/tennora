import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const actor = randomUUID(),
  club = randomUUID(),
  season = randomUUID(),
  players = Array.from({ length: 11 }, () => randomUUID());
let subteam;
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
  proc.stderr.on("data", (d) => (error += d));
  return new Promise((resolve) =>
    proc.on("close", (code) => resolve({ code, error })),
  );
}
const claims = `set local role authenticated; select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);`;
try {
  sql(
    `insert into auth.users(id,email,raw_user_meta_data) values('${actor}','roster-race-${actor}@test.invalid','{"display_name":"Roster Race"}');insert into public.staff_accounts(id,email,display_name) values('${actor}','roster-race-${actor}@test.invalid','Roster Race');insert into public.staff_roles values('${actor}','organizer');begin;${claims}select public.save_team('${club}','Roster Race','Test');select public.save_season('${season}','Roster Race',2026,'2026-01-01','2026-12-31');select public.register_season_team('${season}','${club}');commit;`,
  );
  subteam = sql(
    `select id from public.subteams where team_id='${club}' and age_group='U13'`,
  ).trim();
  for (const player of players)
    sql(
      `insert into public.players(id,team_id,first_name,last_name,gender,date_of_birth,playing_hand,playing_style,sports_level) values('${player}','${club}','Race','Fixture','boy','2014-01-01','right','attack','junior');`,
    );
  for (const player of players.slice(0, 9))
    sql(
      `begin;${claims} select public.add_roster_player('${season}','${subteam}','${player}');commit;`,
    );
  const first = session(
    `set application_name='tennora-roster-capacity-first';begin;${claims}select public.add_roster_player('${season}','${subteam}','${players[9]}');select pg_sleep(2);commit;`,
  );
  let overlap = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      sql(
        "select count(*) from pg_stat_activity where application_name='tennora-roster-capacity-first' and wait_event='PgSleep'",
      ).trim() === "1"
    ) {
      overlap = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!overlap) throw new Error("No held-lock barrier");
  const began = Date.now(),
    second = session(
      `begin;${claims}select public.add_roster_player('${season}','${subteam}','${players[10]}');commit;`,
    );
  const [a, b] = await Promise.all([first, second]),
    blocked = Date.now() - began;
  if (
    a.code !== 0 ||
    b.code === 0 ||
    !b.error.includes("Roster capacity reached") ||
    blocked < 700
  )
    throw new Error("Capacity race failed");
  if (
    sql(
      `select count(*) from public.roster_memberships where subteam_id='${subteam}' and ended_at is null`,
    ).trim() !== "10"
  )
    throw new Error("Capacity exceeded");
  console.log(
    `PASS: concurrent additions overlap ${blocked} ms; exactly 10 active players; eleventh transaction rejected.`,
  );
} finally {
  sql(
    `delete from public.audit_logs where actor_id='${actor}';delete from public.roster_memberships where season_id='${season}';delete from public.rating_history where player_id in (${players.map((p) => `'${p}'`).join(",")});delete from public.players where team_id='${club}';delete from public.season_team_entries where season_id='${season}';delete from public.subteams where team_id='${club}';delete from public.teams where id='${club}';delete from public.seasons where id='${season}';delete from public.staff_roles where user_id='${actor}';delete from public.staff_accounts where id='${actor}';delete from auth.users where id='${actor}';`,
  );
}
