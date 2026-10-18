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
  games,
  clubs = [];
const gameScope = `select g.id from public.singles_games g join public.team_matches m on m.id=g.match_id where m.draw_id='${draw}'`;
const matchScope = `select id from public.team_matches where draw_id='${draw}'`;
const playerScope = `select id from public.players where team_id in(select team_id from public.season_team_entries where season_id='${season}')`;
try {
  const source = readFileSync(
    new URL("../supabase/tests/015_scoring_transactions.sql", import.meta.url),
    "utf8",
  );
  let setup = source
    .slice(0, source.indexOf("-- SCORE_FIXTURE_END"))
    .replace("select no_plan();", "");
  for (let i = 0; i < 6; i++)
    setup = setup.replaceAll(
      `aaaae2b2-0000-4000-8000-00000000000${i + 1}`,
      users[i],
    );
  for (const [before, after] of [
    ["bbbbe2b2-0000-4000-8000-000000000001", season],
    ["cccce2b2-0000-4000-8000-000000000001", tour],
    ["dddde2b2-0000-4000-8000-000000000001", template],
    ["eeeee2b2-0000-4000-8000-000000000001", draw],
    ...[
      "ffffe2b2-0000-4000-8000-000000000001",
      "ffffe2b2-0000-4000-8000-000000000002",
      "ffffe2b2-0000-4000-8000-000000000003",
      "ffffe2b2-0000-4000-8000-000000000010",
      "ffffe2b2-0000-4000-8000-000000000020",
      "dddde2b2-0000-4000-8000-000000000010",
      "dddde2b2-0000-4000-8000-000000000011",
      "dddde2b2-0000-4000-8000-000000000012",
    ].map((id) => [id, randomUUID()]),
  ])
    setup = setup.replaceAll(before, after);
  setup = setup
    .replace(
      "where id::text like 'aaaae2b2-%'",
      `where id in(${users.map((id) => `'${id}'`).join(",")})`,
    )
    .replaceAll("@test.invalid", `-${token}@test.invalid`);
  const output = sql(
    setup +
      "select row_to_json(f) from lineup_fixture f;select row_to_json(f) from score_fixture f;commit;",
  );
  fixture = JSON.parse(
    output.split("\n").find((line) => line.startsWith('{"match":')),
  );
  games = JSON.parse(
    output.split("\n").find((line) => line.startsWith('{"games":')),
  ).games;
  clubs = sql(
    `select team_id from public.season_team_entries where season_id='${season}'`,
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const prepare = (target, start, count) =>
    sql(
      `begin;${claims(users[5])}${start ? `select public.score_command('${randomUUID()}','${target}','start','a',0,'Initial server');` : ""}do $$declare v integer;i integer;begin for i in 1..${count} loop select score_version into v from public.singles_games where id='${target}';perform public.score_command(gen_random_uuid(),'${target}','point','a',v,'Race preparation');end loop;end;$$;commit;`,
    );
  async function compete(target, duplicate, suffix) {
    const command = randomUUID(),
      application = `tennora-score-${token}-${suffix}`;
    const payload = (id) =>
      `select public.score_command('${id}','${target}','point','a',33,'Finishing point');`;
    const first = session(
      `set application_name='${application}';begin;${claims(users[5])}${payload(command)}select pg_sleep(2);commit;`,
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
    if (!overlap) throw new Error("Scoring overlap barrier not reached");
    const adminLocks = sql(
      `select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${application}' and l.locktype='advisory' and l.classid=0 and l.objid in(170002,170005)`,
    ).trim();
    const replay =
      suffix === "stale"
        ? session(
            `set application_name='${application}-replay';begin;select set_config('request.jwt.claims','{"sub":"${users[0]}","role":"authenticated"}',true);select private.replay_effective_ratings();commit;`,
          )
        : undefined;
    if (replay) {
      let waiting = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        if (
          sql(
            `select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='${application}-replay' and l.locktype='advisory' and l.classid=0 and l.objid=170040 and not l.granted`,
          ).trim() === "1"
        ) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      if (!waiting)
        throw new Error(
          "Exclusive replay did not wait for the live scoring barrier",
        );
    }
    const began = Date.now(),
      second = session(
        `begin;${claims(users[5])}${payload(duplicate ? command : randomUUID())}commit;`,
      );
    const [a, b] = await Promise.all([first, second]),
      blocked = Date.now() - began;
    if (
      a.code !== 0 ||
      (duplicate
        ? b.code !== 0
        : b.code === 0 || !b.error.includes("Score version conflict")) ||
      blocked < 700 ||
      adminLocks !== "0"
    )
      throw new Error(
        `Concurrent scoring invariant failed: ${JSON.stringify({ a, b, blocked, adminLocks })}`,
      );
    if (replay) {
      const result = await replay;
      if (result.code !== 0)
        throw new Error(`Exclusive rating replay failed: ${result.error}`);
    }
    const state = sql(
      `select concat(g.status,':',g.score_version,':',(select count(*) from public.singles_results where game_id=g.id),':',(select count(*) from public.rating_calculations where game_id=g.id),':',(select count(*) from public.rating_history where game_result_id=g.result_id),':',(select count(*) from public.score_events where id='${command}')) from public.singles_games g where g.id='${target}'`,
    ).trim();
    if (state !== "finished:34:1:1:2:1")
      throw new Error("One-result/one-Elo invariant failed");
    sql(`begin;${claims(users[5])}${payload(command)}commit;`);
    return blocked;
  }
  prepare(games[0], false, 32);
  const staleMs = await compete(games[0], false, "stale");
  const reviewId = randomUUID(),
    reviewApp = `tennora-review-${token}`;
  const originalResult = sql(
    `select result_id from public.singles_games where id='${games[0]}'`,
  ).trim();
  const reviewPayload = `select public.submit_result_correction('${reviewId}','${games[0]}','${originalResult}','played','a','{"initial_server":"a","sets":[{"a":11,"b":1},{"a":11,"b":0},{"a":11,"b":0}],"timeouts":{"a":false,"b":false}}','Review race');`;
  const reviewA = session(
    `set application_name='${reviewApp}';begin;${claims(users[0])}${reviewPayload}select pg_sleep(2);commit;`,
  );
  let reviewWaiting = false;
  for (let i = 0; i < 50; i++) {
    if (
      sql(
        `select count(*) from pg_stat_activity where application_name='${reviewApp}' and wait_event='PgSleep'`,
      ).trim() === "1"
    ) {
      reviewWaiting = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!reviewWaiting) throw new Error("Correction review barrier not reached");
  const reviewBegan = Date.now(),
    reviewB = session(`begin;${claims(users[0])}${reviewPayload}commit;`);
  const reviewResults = await Promise.all([reviewA, reviewB]),
    reviewMs = Date.now() - reviewBegan;
  if (
    reviewResults.some((v) => v.code !== 0) ||
    reviewMs < 700 ||
    sql(
      `select count(*) from public.result_correction_events where request_id='${reviewId}'`,
    ).trim() !== "1"
  )
    throw new Error("Correction review receipt race failed");
  prepare(games[1], true, 33);
  prepare(games[2], true, 32);
  const duplicateMs = await compete(games[2], true, "duplicate");
  const final = sql(
    `select concat(m.status,':',(select count(*) from public.live_players where match_id=m.id),':',(select count(*) from public.live_subteams where match_id=m.id),':',(select count(*) from public.match_table_leases where match_id=m.id),':',(select count(*) from public.team_match_results where match_id=m.id),':',(select count(*) from public.singles_games where match_id=m.id and status='cancelled'),':',(select count(*) from public.group_standing_heads h join public.group_standing_snapshots s on s.id=h.snapshot_id where h.group_id=m.group_id and s.complete)) from public.team_matches m where id='${fixture.match}'`,
  ).trim();
  if (final !== "finished:0:0:0:1:2:1")
    throw new Error(
      "Atomic team completion/resource/advancement invariant failed",
    );
  const applyId = randomUUID();
  const digest = sql(
    `begin;${claims(users[0])}select public.get_result_correction('${reviewId}')->'plan'->>'digest';commit;`,
  )
    .trim()
    .split("\n")
    .find((v) => /^[a-f0-9]{32}$/.test(v));
  if (!digest) throw new Error("Current correction digest required");
  const applyPayload = `select public.apply_result_correction('${applyId}','${reviewId}','${digest}',false,'Apply race');`;
  const applyA = session(
    `set application_name='${reviewApp}';begin;${claims(users[0])}${applyPayload}select pg_sleep(2);commit;`,
  );
  let applyWaiting = false;
  for (let i = 0; i < 50; i++) {
    if (
      sql(
        `select count(*) from pg_stat_activity where application_name='${reviewApp}' and wait_event='PgSleep'`,
      ).trim() === "1"
    ) {
      applyWaiting = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!applyWaiting) throw new Error("Correction apply barrier not reached");
  const applyBegan = Date.now(),
    applyB = session(`begin;${claims(users[0])}${applyPayload}commit;`),
    applyResults = await Promise.all([applyA, applyB]),
    applyMs = Date.now() - applyBegan;
  if (
    applyResults.some((v) => v.code !== 0) ||
    applyMs < 700 ||
    sql(
      `select count(*) from public.result_correction_events where id='${applyId}' and kind='applied'`,
    ).trim() !== "1" ||
    sql(
      `select result_revision from public.singles_games where id='${games[0]}'`,
    ).trim() !== "2"
  )
    throw new Error("Correction apply race failed");
  console.log(
    `PASS: finishing point races overlap ${staleMs}/${duplicateMs} ms; stale command rejected, exact duplicate acknowledged once, one result/Elo pair per singles, atomic team completion/advancement/resource release; no global administration locks during points; an exclusive saved-K replay safely waits for the shared finishing transaction; correction review/apply retries overlap ${reviewMs}/${applyMs} ms with one event per command.`,
  );
} finally {
  // Only random fixture IDs are removed; existing league accounts/history stay untouched.
  sql(`begin;
    delete from public.audit_logs where actor_id in(${users.map((id) => `'${id}'`).join(",")});
    delete from public.correction_attempts where request_id in(select id from public.result_correction_requests where game_id in(${gameScope}));
    delete from public.result_correction_events where request_id in(select id from public.result_correction_requests where game_id in(${gameScope}));
    delete from public.result_correction_states where request_id in(select id from public.result_correction_requests where game_id in(${gameScope}));
    delete from public.result_correction_requests where game_id in(${gameScope});
    delete from public.active_score_points where game_id in(${gameScope});
    delete from public.score_events where game_id in(${gameScope});
    delete from public.game_sets where game_id in(${gameScope});
    delete from public.player_end_events where game_id in(${gameScope});
    delete from public.rating_replay_anchors where player_id in(${playerScope});
    delete from public.rating_history where player_id in(${playerScope});
    delete from public.rating_calculation_heads where game_id in(${gameScope});
    delete from public.rating_calculations where game_id in(${gameScope});
    update public.singles_games set result_id=null,result_revision=0 where id in(${gameScope});
    delete from public.singles_results where game_id in(${gameScope});
    delete from public.live_players where match_id in(${matchScope});
    delete from public.live_subteams where match_id in(${matchScope});
    delete from public.match_table_leases where match_id in(${matchScope});
    delete from public.match_commands where match_id in(${matchScope});
    delete from public.player_rest_heads where player_id in(${playerScope});
    delete from public.table_day_heads where assignment_id in(select id from public.table_judge_assignments where context_tour_id='${tour}');
    delete from public.table_judge_assignments where context_tour_id='${tour}';
    update public.match_sources set source_snapshot_id=null,source_result_id=null where match_id in(${matchScope});
    update public.team_matches set result_id=null,result_revision=0 where draw_id='${draw}';
    delete from public.team_match_results where match_id in(${matchScope});
    delete from public.group_standing_heads where group_id in(select id from public.stage_groups where draw_id='${draw}');
    delete from public.group_standing_snapshots where group_id in(select id from public.stage_groups where draw_id='${draw}');
    delete from public.group_tie_draws where group_id in(select id from public.stage_groups where draw_id='${draw}');
    delete from public.lineup_replacements where match_id in(${matchScope});
    delete from public.singles_games where match_id in(${matchScope});
    delete from public.lineup_slots where lineup_id in(select id from public.lineups where match_id in(${matchScope}));
    delete from public.lineups where match_id in(${matchScope});
    delete from public.match_sources where match_id in(${matchScope});
    delete from public.team_matches where draw_id='${draw}';
    delete from public.draw_seed_players where entry_id in(select id from public.draw_entries where draw_id='${draw}');
    delete from public.draw_entries where draw_id='${draw}';
    delete from public.stage_groups where draw_id='${draw}';
    delete from public.draw_revisions where id='${draw}';
    delete from public.stages where plan_id in(select id from public.tour_stage_plans where tour_id='${tour}');
    delete from public.tour_stage_plans where tour_id='${tour}';
    delete from public.season_configuration_snapshots where season_id='${season}';
    delete from public.tournament_settings where tour_id='${tour}';
    delete from public.tours where id='${tour}';
    delete from public.stage_templates where id='${template}';
    delete from public.roster_memberships where season_id='${season}';
    delete from public.players where id in(${playerScope});
    delete from public.subteam_trainers where trainer_id in(${users.map((id) => `'${id}'`).join(",")});
    delete from public.trainer_profiles where user_id in(${users.map((id) => `'${id}'`).join(",")});
    delete from public.subteams where team_id in(select team_id from public.season_team_entries where season_id='${season}');
    delete from public.season_team_entries where season_id='${season}';
    ${clubs.length ? `delete from public.teams where id in(${clubs.map((id) => `'${id}'`).join(",")});` : ""}
    delete from public.seasons where id='${season}';
    delete from public.staff_roles where user_id in(${users.map((id) => `'${id}'`).join(",")});
    delete from public.staff_accounts where id in(${users.map((id) => `'${id}'`).join(",")});
    delete from auth.users where id in(${users.map((id) => `'${id}'`).join(",")});commit;`);
}
