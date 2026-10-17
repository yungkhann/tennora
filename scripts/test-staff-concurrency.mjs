// Local database integration proof: competing Organizers cannot remove each other.
import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const ids = [randomUUID(), randomUUID()];
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
  let output = "",
    error = "";
  proc.stdout.on("data", (d) => (output += d));
  proc.stderr.on("data", (d) => (error += d));
  const done = new Promise((resolve) =>
    proc.on("close", (code) => resolve({ code, output, error })),
  );
  return { proc, done };
}
try {
  for (const id of ids)
    sql(
      `insert into auth.users(id,email,raw_user_meta_data) values('${id}','concurrency-${id}@test.invalid','{"display_name":"Concurrency Fixture"}'); insert into public.staff_accounts(id,email,display_name) values('${id}','concurrency-${id}@test.invalid','Concurrency Fixture'); insert into public.staff_roles values('${id}','organizer');`,
    );
  const first = session(
    `set application_name='tennora-staff-concurrency-first'; begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"${ids[0]}","role":"authenticated"}',true); select public.change_staff('${ids[1]}',array['organizer']::public.staff_role[],false); select pg_sleep(2); commit;`,
  );
  let overlapping = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      sql(
        "select count(*) from pg_stat_activity where application_name='tennora-staff-concurrency-first' and wait_event='PgSleep';",
      ).trim() === "1"
    ) {
      overlapping = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!overlapping)
    throw new Error("First transaction never reached its held-lock barrier");
  const secondStarted = Date.now();
  const second = session(
    `begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"${ids[1]}","role":"authenticated"}',true); select public.change_staff('${ids[0]}',array['organizer']::public.staff_role[],false); commit;`,
  );
  const [a, b] = await Promise.all([first.done, second.done]);
  const blockedFor = Date.now() - secondStarted;
  if (blockedFor < 700)
    throw new Error(
      "Second transaction did not overlap the held administration lock",
    );
  if (a.code !== 0 || b.code === 0 || !b.error.includes("Organizer required"))
    throw new Error("Competing permission check failed");
  const active = sql(
    `select count(*) from public.staff_accounts where id in ('${ids[0]}','${ids[1]}') and active;`,
  ).trim();
  if (active !== "1")
    throw new Error("Expected one surviving active Organizer");
  console.log(
    `PASS: competing deactivations serialize (${blockedFor} ms overlap); revoked actor is rejected; one Organizer remains active.`,
  );
} finally {
  sql(
    `delete from public.audit_logs where actor_id in ('${ids[0]}','${ids[1]}'); delete from public.staff_roles where user_id in ('${ids[0]}','${ids[1]}'); delete from public.staff_accounts where id in ('${ids[0]}','${ids[1]}'); delete from auth.users where id in ('${ids[0]}','${ids[1]}');`,
  );
}
