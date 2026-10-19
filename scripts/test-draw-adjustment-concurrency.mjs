import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const actor = randomUUID(),
  season = randomUUID(),
  tour = randomUUID(),
  template = randomUUID(),
  draw = randomUUID(),
  attemptedDraw = randomUUID(),
  clubs = [randomUUID(), randomUUID()];
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
  const process = spawn("docker", [
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
  process.stdout.resume();
  process.stderr.on("data", (data) => (error += data));
  return new Promise((resolve) =>
    process.on("close", (code) => resolve({ code, error })),
  );
}
const claims = `set local role authenticated;select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);`;
try {
  sql(
    `insert into auth.users(id,email,raw_user_meta_data) values('${actor}','draw-race-${actor}@test.invalid','{"display_name":"Draw Race"}');insert into public.staff_accounts(id,email,display_name) values('${actor}','draw-race-${actor}@test.invalid','Draw Race');insert into public.staff_roles values('${actor}','organizer');begin;${claims}select public.save_season('${season}','Draw Race',2026,'2026-01-01','2026-12-31');select public.save_tour('${tour}','${season}','Draw Race',1,'2026-03-01','2026-03-03');select public.create_stage_template('${template}','Draw Race','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');select public.configure_tour_stages('${tour}','${template}',array['U13','U15','U17']::public.age_group[]);select public.save_tournament_settings(gen_random_uuid(),'${tour}',0,32,12,60,true,'Asia/Almaty');${clubs.map((club) => `select public.save_team('${club}','Draw Race Club','Synthetic');select public.register_season_team('${season}','${club}');`).join("")}do $body$ declare club uuid;sub uuid;person uuid;i integer;begin foreach club in array array[${clubs.map((c) => `'${c}'::uuid`).join(",")}] loop select id into sub from public.subteams where team_id=club and age_group='U13';for i in 1..5 loop person:=gen_random_uuid();perform public.save_player(person,club,'Race','Player',case when i<=3 then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior');perform public.add_roster_player('${season}',sub,person);end loop;end loop;end;$body$;select public.start_season('${season}');select public.generate_tour_draw('${draw}','${tour}','U13',0);commit;`,
  );
  const first = session(
    `set application_name='tennora-adjust-publish-race';begin;${claims}select public.publish_tour_draw('${draw}',1);select pg_sleep(2);commit;`,
  );
  let overlap = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      sql(
        "select count(*) from pg_stat_activity where application_name='tennora-adjust-publish-race' and wait_event='PgSleep'",
      ).trim() === "1"
    ) {
      overlap = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!overlap) throw new Error("No publication lock barrier");
  const began = Date.now(),
    second = session(
      `begin;${claims}select public.swap_draw_seeds('${attemptedDraw}','${draw}',1,1,2,true);commit;`,
    ),
    [a, b] = await Promise.all([first, second]),
    blocked = Date.now() - began;
  if (
    a.code !== 0 ||
    b.code === 0 ||
    !b.error.includes("Published draw is locked") ||
    blocked < 700
  )
    throw new Error("Adjustment publication race failed");
  if (
    sql(
      `select count(*) from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id='${tour}'`,
    ).trim() !== "1"
  )
    throw new Error("Publication allowed another revision");
  console.log(
    `PASS: publication/adjustment overlap ${blocked} ms; published graph preserved; waiting seed adjustment rejected.`,
  );
} finally {
  sql(
    `delete from public.audit_logs where actor_id='${actor}';delete from public.match_sources where match_id in(select id from public.team_matches where draw_id in('${draw}','${attemptedDraw}'));delete from public.team_matches where draw_id in('${draw}','${attemptedDraw}');delete from public.draw_seed_players where entry_id in(select id from public.draw_entries where draw_id in('${draw}','${attemptedDraw}'));delete from public.draw_entries where draw_id in('${draw}','${attemptedDraw}');delete from public.stage_groups where draw_id in('${draw}','${attemptedDraw}');delete from public.draw_seed_adjustments where draw_id in('${draw}','${attemptedDraw}');delete from public.draw_revisions where id in('${draw}','${attemptedDraw}');delete from public.stages where plan_id in(select id from public.tour_stage_plans where tour_id='${tour}');delete from public.tour_stage_plans where tour_id='${tour}';delete from public.season_configuration_snapshots where season_id='${season}';delete from public.tournament_settings where tour_id='${tour}';delete from public.tours where id='${tour}';delete from public.stage_templates where id='${template}';delete from public.roster_memberships where season_id='${season}';delete from public.rating_history where player_id in(select id from public.players where team_id in(${clubs.map((c) => `'${c}'`).join(",")}));delete from public.players where team_id in(${clubs.map((c) => `'${c}'`).join(",")});delete from public.season_team_entries where season_id='${season}';delete from public.subteams where team_id in(${clubs.map((c) => `'${c}'`).join(",")});delete from public.teams where id in(${clubs.map((c) => `'${c}'`).join(",")});delete from public.seasons where id='${season}';delete from public.staff_roles where user_id='${actor}';delete from public.staff_accounts where id='${actor}';delete from auth.users where id='${actor}';`,
  );
}
