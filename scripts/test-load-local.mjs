import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHallScaleFixture } from "./test-hall-scale.mjs";
import { localSql, cleanupLoadFixture } from "./lib/local-fixture-cleanup.mjs";
import { Histogram } from "./lib/histogram.mjs";
const metadataPath = join(tmpdir(), "tennora-production-readiness.json");
if (!existsSync(metadataPath))
  throw new Error("Start scripts/serve-local-production.mjs first.");
const runtime = JSON.parse(readFileSync(metadataPath, "utf8"));
if (runtime.origin !== "https://127.0.0.1:3443")
  throw new Error("Loopback-only production harness required");
if (process.env.TENNORA_LOAD_CHILD !== "true") {
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      env: {
        ...process.env,
        NODE_EXTRA_CA_CERTS: runtime.certificate,
        TENNORA_LOAD_CHILD: "true",
      },
      stdio: "inherit",
    },
  );
  process.exit(child.status ?? 1);
}
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  secret = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
if (!backend || new URL(backend).hostname !== "127.0.0.1" || !key || !secret)
  throw new Error("Local disposable backend credentials required");
const integer = (name, fallback, min, max) => {
  const found = process.argv.find((v) => v.startsWith(`--${name}=`)),
    number = found ? Number(found.split("=")[1]) : fallback;
  if (!Number.isInteger(number) || number < min || number > max)
    throw new Error(`Invalid ${name}`);
  return number;
};
const viewers = integer("viewers", 50, 1, 2000),
  seconds = integer("seconds", 60, 10, 1800),
  interval = integer("point-ms", 10000, 1000, 60000),
  fixture = createHallScaleFixture(128),
  f = {
    actor: fixture.actor,
    season: fixture.season,
    tour: fixture.tour,
    template: fixture.template,
    token: fixture.token,
    judges: [],
  },
  recoveryFile = join(tmpdir(), `tennora-load-${f.token}.json`),
  admin = createClient(backend, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
  anonymous = () =>
    createClient(backend, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: { heartbeatIntervalMs: 20000, timeout: 15000 },
    }),
  check = (result) => {
    if (result.error)
      throw new Error(
        `Disposable operation failed: ${result.error.code ?? result.error.status ?? "unknown"}`,
      );
    return result.data;
  },
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const metrics = {
    tap_ack: new Histogram(),
    rpc_round_trip: new Histogram(),
    tap_to_viewer: new Histogram(),
    connect_snapshot: new Histogram(),
    reconnect: new Histogram(),
    public_read: new Histogram(),
  },
  records = [],
  pending = new Map();
let stopping = false,
  scoreErrors = 0,
  readErrors = 0,
  disconnects = 0,
  gaps = 0,
  reconnected = false,
  fixtureCreated = false,
  activeMatches = 0,
  connected = 0;
const saveRecovery = () =>
  writeFileSync(recoveryFile, JSON.stringify(f), { mode: 0o600 });
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function signedClient(email, password) {
  let cookies = [];
  const client = createServerClient(backend, key, {
    cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => cookies,
      setAll: (values) => {
        for (const value of values) {
          cookies = cookies.filter((v) => v.name !== value.name);
          cookies.push({ name: value.name, value: value.value });
        }
      },
    },
  });
  check(await client.auth.signInWithPassword({ email, password }));
  return {
    client,
    headers: () => ({
      "Content-Type": "application/json",
      Origin: runtime.origin,
      Cookie: cookies
        .map((v) => `${v.name}=${encodeURIComponent(v.value)}`)
        .join("; "),
    }),
  };
}
async function send(judge, body, timed = true) {
  const began = performance.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${runtime.origin}/api/scoring`, {
        method: "POST",
        headers: judge.headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        if (response.status === 503 && attempt < 2) {
          await pause(100);
          continue;
        }
        throw new Error(`Score HTTP ${response.status}`);
      }
      const value = await response.json();
      if (timed) {
        metrics.tap_ack.add(performance.now() - began);
        const rpc = /rpc;dur=([\d.]+)/.exec(
          response.headers.get("server-timing") ?? "",
        );
        if (rpc) metrics.rpc_round_trip.add(Number(rpc[1]));
      }
      return value;
    } catch (error) {
      if (attempt === 2) throw error;
      await pause(100);
    }
  }
}
async function readSnapshot(fresh = false) {
  const response = await fetch(
    `${runtime.origin}/api/public/matches${fresh ? `?fresh=${Date.now()}` : ""}`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
  return (await response.json()).filter((row) => row.tour_id === f.tour);
}
async function subscribe(record, reconnect = false) {
  const began = performance.now(),
    epoch = ++record.epoch;
  record.client = anonymous();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Realtime join timeout")),
      15000,
    );
    record.client
      .channel(`load-${f.token}-${record.index}-${epoch}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "public_match_snapshots",
          filter: `tour_id=eq.${f.tour}`,
        },
        (payload) => {
          if (stopping || record.epoch !== epoch) return;
          const row = payload.new;
          if (!row?.match_id || !Number.isFinite(row.version)) return;
          const previous = record.versions.get(row.match_id);
          if (previous && row.version <= previous) return;
          if (previous && row.version > previous + 1) gaps++;
          record.versions.set(row.match_id, row.version);
          const game = row.data?.singles?.find(
              (v) => v.status === "in_progress",
            ),
            summary = game?.summary;
          if (!summary) return;
          const sent = pending.get(
            `${row.match_id}:${summary.points_a}:${summary.points_b}`,
          );
          if (sent !== undefined)
            metrics.tap_to_viewer.add(performance.now() - sent);
        },
      )
      .subscribe(async (status) => {
        if (record.epoch !== epoch) return;
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          try {
            for (const row of await readSnapshot(true))
              record.versions.set(
                row.match_id,
                Math.max(row.version, record.versions.get(row.match_id) ?? 0),
              );
            if (!record.connected) {
              record.connected = true;
              connected++;
            }
            (reconnect ? metrics.reconnect : metrics.connect_snapshot).add(
              performance.now() - began,
            );
            resolve();
          } catch (error) {
            reject(error);
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          reject(new Error("Realtime unavailable"));
        }
      });
  });
}
try {
  saveRecovery();
  console.log(
    JSON.stringify({ phase: "prepare", viewers, seconds, matches: 30 }),
  );
  const password = `Load!${randomUUID()}`;
  check(
    await admin.auth.admin.createUser({
      id: f.actor,
      email: `scale-${f.actor}@test.invalid`,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Scale Fixture" },
    }),
  );
  fixtureCreated = true;
  localSql(
    fixture.query
      .replace(
        `insert into auth.users(id,email,raw_user_meta_data) values('${f.actor}','scale-${f.actor}@test.invalid','{"display_name":"Scale Fixture"}');`,
        "",
      )
      .replace(/rollback;\s*$/, "commit;"),
  );
  const operator = await signedClient(
    `scale-${f.actor}@test.invalid`,
    password,
  );
  const matches = JSON.parse(
    localSql(
      `select coalesce(json_agg(x),'[]') from (select m.id,m.version from public.team_matches m join public.match_table_leases l on l.match_id=m.id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id='${f.tour}' order by m.id limit 30) x`,
    ),
  );
  if (matches.length !== 30)
    throw new Error("Thirty reserved matches required");
  const free = localSql(
    "select number from public.league_tables where number>=65 and not exists(select 1 from public.table_day_heads where table_number=number) and not exists(select 1 from public.match_table_leases where table_number=number) order by number limit 30",
  )
    .trim()
    .split("\n")
    .map(Number);
  if (free.length < 30)
    throw new Error("Thirty unused local fixture tables required");
  const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Almaty",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    judges = [];
  for (const [i, match] of matches.entries()) {
    const email = `load-${f.token}-${i}@test.invalid`,
      pass = `Judge!${randomUUID()}`,
      created = check(
        await admin.auth.admin.createUser({
          email,
          password: pass,
          email_confirm: true,
        }),
      );
    f.judges.push(created.user.id);
    saveRecovery();
    check(
      await admin.from("staff_accounts").insert({
        id: created.user.id,
        email,
        display_name: `Synthetic load judge ${i + 1}`,
      }),
    );
    check(
      await admin
        .from("staff_roles")
        .insert({ user_id: created.user.id, role: "line_judge" }),
    );
    check(
      await operator.client.rpc("manage_match", {
        command_id: randomUUID(),
        match: match.id,
        operation: "assign",
        table_no: free[i],
        expected_version: match.version,
        reason: "Disposable local load reservation",
      }),
    );
    check(
      await operator.client.rpc("assign_table_judge", {
        assignment_id: randomUUID(),
        tournament: f.tour,
        table_no: free[i],
        venue_day: today,
        staff: created.user.id,
        expected_version: 0,
        reason: "Disposable local load scoring owner",
      }),
    );
    const judge = await signedClient(email, pass),
      game = check(
        await admin
          .from("singles_games")
          .select("id")
          .eq("match_id", match.id)
          .eq("slot", 1)
          .single(),
      );
    judges.push({
      ...judge,
      game: game.id,
      match: match.id,
      version: 0,
      a: 0,
      b: 0,
    });
  }
  check(
    await operator.client.rpc("run_hall_command", {
      command_id: randomUUID(),
      tournament: f.tour,
      operation: "start_all",
      reason: "Thirty local load tables ready",
    }),
  );
  for (const judge of judges) {
    const value = await send(
      judge,
      {
        command_id: randomUUID(),
        game: judge.game,
        kind: "start",
        side: "a",
        expected_version: 0,
        note: "Local load first server",
      },
      false,
    );
    judge.version = value.version;
  }
  activeMatches = (await readSnapshot(true)).filter(
    (row) => row.data.status === "in_progress",
  ).length;
  if (activeMatches !== 30)
    throw new Error("Thirty actual live matches required");
  console.log(JSON.stringify({ phase: "connect", matches: activeMatches }));
  for (let i = 0; i < viewers; i += 25) {
    await Promise.all(
      Array.from({ length: Math.min(25, viewers - i) }, (_, offset) => {
        const record = {
          index: i + offset,
          epoch: 0,
          client: null,
          versions: new Map(),
          connected: false,
        };
        records.push(record);
        return subscribe(record);
      }),
    );
    if (stopping) throw new Error("Load interrupted");
  }
  const started = performance.now(),
    ends = Date.now() + seconds * 1000;
  const progress = setInterval(
    () =>
      console.log(
        JSON.stringify({
          phase: "running",
          elapsed_seconds: Math.round((performance.now() - started) / 1000),
          connected,
          ack: metrics.tap_ack.summary(),
          viewer: metrics.tap_to_viewer.summary(),
          errors: scoreErrors + readErrors,
        }),
      ),
    10000,
  );
  const writers = judges.map(async (judge, index) => {
    let next = Date.now() + (index * interval) / 30,
      turn = 0;
    while (!stopping && Date.now() < ends) {
      await pause(Math.max(0, next - Date.now()));
      if (stopping || Date.now() >= ends) break;
      const side = turn++ % 2 === 0 ? "a" : "b",
        a = judge.a + Number(side === "a"),
        b = judge.b + Number(side === "b");
      pending.set(`${judge.match}:${a}:${b}`, performance.now());
      try {
        const value = await send(judge, {
          command_id: randomUUID(),
          game: judge.game,
          kind: "point",
          side,
          expected_version: judge.version,
          note: "Local load point",
        });
        judge.version = value.version;
        judge.a = a;
        judge.b = b;
      } catch {
        scoreErrors++;
        stopping = true;
        break;
      }
      next += interval;
    }
  });
  const reader = (async () => {
    while (!stopping && Date.now() < ends) {
      const began = performance.now();
      try {
        await readSnapshot();
        metrics.public_read.add(performance.now() - began);
      } catch {
        readErrors++;
      }
      await pause(1000);
    }
  })();
  const reconnect = (async () => {
    await pause(Math.floor(seconds * 500));
    if (stopping) return;
    console.log(
      JSON.stringify({ phase: "forced_reconnect", viewers: records.length }),
    );
    await Promise.all(
      records.map(async (record) => {
        record.epoch++;
        record.connected = false;
        connected--;
        record.client.realtime.disconnect();
        await record.client.removeAllChannels();
        disconnects++;
        await subscribe(record, true);
      }),
    );
    reconnected = true;
  })();
  try {
    await Promise.all([...writers, reader, reconnect]);
  } finally {
    clearInterval(progress);
  }
  const summary = Object.fromEntries(
      Object.entries(metrics).map(([name, histogram]) => [
        name,
        histogram.summary(),
      ]),
    ),
    passed =
      !stopping &&
      scoreErrors === 0 &&
      readErrors === 0 &&
      connected === viewers &&
      reconnected &&
      summary.tap_ack.samples > 0 &&
      summary.tap_to_viewer.samples >=
        summary.tap_ack.samples * viewers * 0.9 &&
      summary.tap_ack.p95_ms <= 300 &&
      summary.tap_ack.p99_ms <= 600 &&
      summary.tap_to_viewer.p95_ms <= 1000 &&
      summary.tap_to_viewer.p99_ms <= 2000 &&
      summary.connect_snapshot.p95_ms <= 1000 &&
      summary.connect_snapshot.p99_ms <= 3000 &&
      summary.reconnect.p95_ms <= 3000 &&
      summary.reconnect.p99_ms <= 8000 &&
      summary.public_read.p95_ms <= 150 &&
      summary.public_read.p99_ms <= 400;
  const report = {
    scope:
      "local HTTPS production runtime with disposable emulated tablets; not hosted/venue acceptance",
    runtime: process.version,
    viewers,
    active_matches: activeMatches,
    requested_seconds: seconds,
    elapsed_seconds: Math.round((performance.now() - started) / 1000),
    reconnected,
    forced_disconnects: disconnects,
    score_errors: scoreErrors,
    read_errors: readErrors,
    gaps,
    metrics: summary,
    local_targets_passed: passed,
  };
  mkdirSync("output/readiness", { recursive: true });
  writeFileSync(
    `output/readiness/local-load-${viewers}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  if (!passed) process.exitCode = 1;
} catch (error) {
  mkdirSync("output/readiness", { recursive: true });
  writeFileSync(
    `output/readiness/local-load-${viewers}.json`,
    JSON.stringify(
      {
        scope: "local HTTPS production runtime; not hosted/venue acceptance",
        viewers,
        active_matches: 30,
        requested_seconds: seconds,
        connected,
        local_targets_passed: false,
        failure:
          "Readiness run failed before completion; inspect local logs and service capacity",
        metrics: Object.fromEntries(
          Object.entries(metrics).map(([name, h]) => [name, h.summary()]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  throw error;
} finally {
  stopping = true;
  await Promise.allSettled(
    records.map((record) => record.client?.removeAllChannels()),
  );
  if (fixtureCreated) cleanupLoadFixture(f);
  // Auth deletion is idempotent after exact fixture SQL cleanup, including a failed seed.
  for (const id of [f.actor, ...f.judges])
    await admin.auth.admin.deleteUser(id);
  rmSync(recoveryFile, { force: true });
}
