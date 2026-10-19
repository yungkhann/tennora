import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const users = Array.from({ length: 5 }, () => randomUUID()),
  season = randomUUID(),
  tour = randomUUID(),
  assignment = randomUUID(),
  takeover = randomUUID(),
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

try {
  const source = readFileSync(
    new URL("../supabase/tests/013_match_day_authority.sql", import.meta.url),
    "utf8",
  );
  let setup = source
    .slice(0, source.indexOf("-- MATCH_DAY_FIXTURE_END"))
    .replace("select no_plan();", "");
  for (let i = 0; i < 5; i++)
    setup = setup.replaceAll(
      `aaaae200-0000-4000-8000-00000000000${i + 1}`,
      users[i],
    );
  setup = setup
    .replaceAll("bbbbe200-0000-4000-8000-000000000001", season)
    .replaceAll("cccce200-0000-4000-8000-000000000001", tour)
    .replaceAll("dddde200-0000-4000-8000-000000000001", assignment);
  setup = setup
    .replace(
      "where id::text like 'aaaae200-%'",
      `where id in(${users.map((id) => `'${id}'`).join(",")})`,
    )
    .replaceAll("@test.invalid", `-${token}@test.invalid`);
  sql(
    setup +
      `select public.assign_table_judge('${assignment}','${tour}',128,day,'${users[2]}',0,true) from day_fixture;commit;`,
  );
  const application = `tennora-owner-lock-${token}`;
  const first = session(
    `set application_name='${application}';begin;select 1 from public.table_day_heads where assignment_id='${assignment}' for share;select pg_sleep(2);select 1 from public.tours where id='${tour}' for update;commit;`,
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
  if (!overlap) throw new Error("Scoring-owner lock barrier not reached");
  const began = Date.now();
  const second = session(
    `begin;${claims(users[0])}select public.takeover_table('${takeover}','${tour}',128,(clock_timestamp() at time zone 'Asia/Almaty')::date,1,true);commit;`,
  );
  const [a, b] = await Promise.all([first, second]),
    blocked = Date.now() - began;
  if (a.code !== 0 || b.code !== 0 || blocked < 700)
    throw new Error("Takeover/result lock-order failure");
  const owner = sql(
    `select staff_id||':'||version from public.table_day_heads where assignment_id='${takeover}'`,
  ).trim();
  if (owner !== `${users[0]}:2`)
    throw new Error("Takeover head was not committed once");
  console.log(
    `PASS: takeover waits ${blocked} ms for scoring ownership; result tour lock commits without deadlock; one new head.`,
  );
} finally {
  sql(
    `begin;delete from public.audit_logs where actor_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.table_day_heads where assignment_id in(select id from public.table_judge_assignments where context_tour_id='${tour}');delete from public.table_judge_assignments where context_tour_id='${tour}';delete from public.tournament_settings where tour_id='${tour}';delete from public.tours where id='${tour}';delete from public.seasons where id='${season}';delete from public.staff_roles where user_id in(${users.map((id) => `'${id}'`).join(",")});delete from public.staff_accounts where id in(${users.map((id) => `'${id}'`).join(",")});delete from auth.users where id in(${users.map((id) => `'${id}'`).join(",")});commit;`,
  );
}
