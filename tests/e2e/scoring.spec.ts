import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
import { drawFixture } from "./helpers/draw-fixture";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL;
test.skip(
  !backend ||
    new URL(backend).hostname !== "127.0.0.1" ||
    !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  "Local disposable fixtures required.",
);
test("judge scores committed points, survives lost acknowledgement/reload and loses authority on takeover", async ({
  page,
  context,
  request,
}, testInfo) => {
  test.setTimeout(120000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const f = await drawFixture({
      knockoutSize: 2,
      currentDay: true,
      tables: 128,
    }),
    table = testInfo.project.name === "mobile" ? 128 : 127;
  const trainer = createClient<Database>(
    backend!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const check = (r: { error: unknown }) => expect(r.error).toBeNull();
  try {
    check(
      await f.admin.from("staff_roles").insert([
        { user_id: f.users[1], role: "line_judge" },
        { user_id: f.users[0], role: "trainer" },
      ]),
    );
    const draw = randomUUID();
    check(
      await f.operator.rpc("generate_tour_draw", {
        draw_id: draw,
        tournament: f.tour,
        age: "U13",
        expected_revision: 0,
      }),
    );
    check(
      await f.operator.rpc("publish_tour_draw", { draw, expected_revision: 1 }),
    );
    const found = await f.admin
      .from("team_matches")
      .select("id,subteam_a,subteam_b")
      .eq("draw_id", draw)
      .single();
    check(found);
    const m = found.data!;
    const subs = await f.admin
      .from("subteams")
      .select("id,team_id")
      .in("id", [m.subteam_a!, m.subteam_b!]);
    check(subs);
    const people = await f.admin
      .from("players")
      .select("id,team_id,gender")
      .in(
        "team_id",
        subs.data!.map((v) => v.team_id),
      );
    check(people);
    const ordered = (sub: string) => {
      const club = subs.data!.find((v) => v.id === sub)!.team_id,
        b = people.data!.filter(
          (v) => v.team_id === club && v.gender === "boy",
        ),
        g = people.data!.filter(
          (v) => v.team_id === club && v.gender === "girl",
        );
      return [b[0].id, g[0].id, b[1].id, g[1].id, b[2].id];
    };
    for (const [sub, actor] of [
      [m.subteam_a!, f.users[2]],
      [m.subteam_b!, f.users[0]],
    ])
      check(
        await f.operator.rpc("assign_team_trainer", {
          trainer: actor,
          club: subs.data!.find((v) => v.id === sub)!.team_id,
          coached_subteams: [sub],
        }),
      );
    check(
      await trainer.auth.signInWithPassword({
        email: f.emails[2],
        password: f.password,
      }),
    );
    check(
      await trainer.rpc("submit_lineup", {
        lineup_id: randomUUID(),
        match: m.id,
        subteam: m.subteam_a!,
        players: ordered(m.subteam_a!),
      }),
    );
    check(
      await f.operator.rpc("submit_lineup", {
        lineup_id: randomUUID(),
        match: m.id,
        subteam: m.subteam_b!,
        players: ordered(m.subteam_b!),
      }),
    );
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Almaty",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    check(
      await f.operator.rpc("assign_table_judge", {
        assignment_id: randomUUID(),
        tournament: f.tour,
        table_no: table,
        venue_day: today,
        staff: f.users[1],
        expected_version: 0,
        confirmed: true,
      }),
    );
    for (const [operation, version] of [
      ["assign", 2],
      ["call", 3],
      ["start", 4],
    ] as const)
      check(
        await f.operator.rpc("manage_match", {
          command_id: randomUUID(),
          match: m.id,
          operation,
          table_no: operation === "assign" ? table : null!,
          expected_version: version,
          confirmed: true,
        }),
      );
    const games = await f.admin
      .from("singles_games")
      .select("id")
      .eq("match_id", m.id)
      .order("slot");
    check(games);
    const game = games.data![0].id;
    expect((await request.get("/api/staff/judge-desk")).status()).toBe(401);
    expect((await request.get(`/api/staff/scoring/${game}`)).status()).toBe(
      401,
    );
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[1]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Judge desk", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `Table ${table}`, exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Open scoring/ }).click();
    await expect(
      page.getByRole("button", { name: "Start · A serves" }),
    ).toBeEnabled();
    const read = await page.request.get(`/api/staff/scoring/${game}`);
    expect(read.headers()["cache-control"]).toContain("no-store");
    const safe = await read.json();
    expect(safe).not.toHaveProperty("date_of_birth");
    expect(safe.players.a).not.toHaveProperty("date_of_birth");
    const valid = {
      command_id: randomUUID(),
      game,
      kind: "point",
      side: "a",
      expected_version: 0,
    };
    expect(
      (await page.request.post("/api/scoring", { data: valid })).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/scoring", {
          headers: { Origin: "https://untrusted.invalid" },
          data: valid,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/scoring", {
          headers: { Origin: "http://127.0.0.1:3000" },
          data: { ...valid, actor_id: f.users[0] },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/scoring", {
          headers: { Origin: "http://127.0.0.1:3000" },
          data: { ...valid, note: "x".repeat(9000) },
        })
      ).status(),
    ).toBe(400);
    await page.getByRole("button", { name: "Start · A serves" }).click();
    await expect(page.getByTestId("point-a")).toBeEnabled();
    const controlContrast = await page
      .locator(".judge-court button")
      .evaluateAll((buttons) => {
        const luminance = (css: string) => {
          const channels = css
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const n = v / 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
          return (
            channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
          );
        };
        return buttons.map((button) => {
          const style = getComputedStyle(button),
            a = luminance(style.color),
            b = luminance(style.backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      });
    expect(Math.min(...controlContrast)).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({
      path: `/tmp/tennora-judge-${testInfo.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(
      (
        await page.request.post("/api/scoring", {
          headers: { Origin: "http://127.0.0.1:3000" },
          data: valid,
        })
      ).status(),
    ).toBe(409);
    await page.getByTestId("point-a").evaluate((el: HTMLButtonElement) => {
      el.click();
      el.click();
    });
    await expect(page.getByTestId("points-a")).toHaveText("1");
    await expect(page.getByTestId("point-a")).toBeEnabled();
    await page.getByRole("button", { name: "Undo last point" }).click();
    await expect(page.getByTestId("points-a")).toHaveText("0");
    await page.getByTestId("point-a").click();
    await expect(page.getByTestId("points-a")).toHaveText("1");
    await page.getByRole("button", { name: "Timeout · 60 s" }).first().click();
    await expect(page.getByRole("timer")).toContainText("Timeout A");
    await expect(page.getByTestId("point-a")).toBeDisabled();
    await page
      .getByRole("button", { name: "Resume play", exact: true })
      .click();
    await expect(page.getByTestId("point-a")).toBeEnabled();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Clear set", exact: true }).click();
    await expect(page.getByTestId("points-a")).toHaveText("0");
    await expect(
      page.getByRole("button", { name: "Timeout used", exact: true }),
    ).toBeDisabled();
    let uncertainId = "";
    await page.route(
      "**/api/scoring",
      async (route) => {
        uncertainId = route.request().postDataJSON().command_id;
        await route.fetch();
        await route.abort("failed");
      },
      { times: 1 },
    );
    await page.getByTestId("point-a").click();
    await expect(
      page.getByRole("button", { name: "Retry last command" }),
    ).toBeVisible();
    await expect(page.getByTestId("point-a")).toBeDisabled();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Retry last command" }),
    ).toBeVisible();
    await expect(page.getByTestId("point-a")).toBeDisabled();
    await page.route(
      "**/api/scoring",
      (route) =>
        route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: { "Retry-After": "60" },
          body: JSON.stringify({ error: "rate_limited" }),
        }),
      { times: 1 },
    );
    await page.getByRole("button", { name: "Retry last command" }).click();
    await expect(
      page.getByText(
        "Too many requests. Wait one minute, then check the connection.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByTestId("point-a")).toBeDisabled();
    expect(
      await page.evaluate(() =>
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith("tennora-score:"))
          .map((key) => JSON.parse(sessionStorage.getItem(key)!).command_id),
      ),
    ).toEqual([uncertainId]);
    await page.getByRole("button", { name: "Retry last command" }).click();
    await expect(page.getByTestId("point-a")).toBeEnabled();
    await expect(page.getByTestId("points-a")).toHaveText("1");
    const events = await f.admin
      .from("score_events")
      .select("id", { count: "exact" })
      .eq("id", uncertainId);
    check(events);
    expect(events.count).toBe(1);
    await context.setOffline(true);
    await expect(page.getByTestId("point-a")).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByTestId("point-a")).toBeEnabled({ timeout: 15000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("judge-score.png"),
      fullPage: true,
    });
    check(
      await f.operator.rpc("takeover_table", {
        assignment_id: randomUUID(),
        tournament: f.tour,
        table_no: table,
        venue_day: today,
        expected_version: 1,
        confirmed: true,
      }),
    );
    await page
      .getByRole("button", { name: "Check connection", exact: true })
      .click();
    await expect(
      page.getByText(
        "Read only. Scoring requires the current table assignment.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId("point-a")).toBeDisabled();
    for (let i = 0; i < 32; i++) {
      const g = await f.admin
        .from("singles_games")
        .select("score_version")
        .eq("id", game)
        .single();
      check(g);
      check(
        await f.operator.rpc("score_command", {
          confirmed: true,
          command_id: randomUUID(),
          game,
          kind: "point",
          side: "a",
          expected_version: g.data!.score_version,
          note: "Complete browser fixture",
        }),
      );
    }
    await page
      .getByRole("button", { name: "Check connection", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Singles complete", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Next singles" }),
    ).toBeVisible();
    await page.goto(`/ru/linear-judge/${game}`);
    await expect(
      page.getByRole("heading", {
        name: "Одиночная игра завершена",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(`/kk/linear-judge/${game}`);
    await expect(
      page.getByRole("heading", { name: "Жеке ойын аяқталды", exact: true }),
    ).toBeVisible();
    // A singles retirement is independent of league-wide dropout.
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    const next = games.data![1].id;
    await page.goto(`/en/linear-judge/${next}`);
    await page.getByRole("button", { name: "Start · A serves" }).click();
    const retirement = page.getByRole("form", {
      name: "Record singles retirement",
      exact: true,
    });
    await retirement
      .getByLabel("I confirm this action", { exact: true })
      .check();
    await retirement.getByRole("checkbox").check();
    await retirement
      .getByRole("button", { name: "Record singles retirement", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Singles complete", exact: true }),
    ).toBeVisible();
    const retired = await f.admin
      .from("singles_games")
      .select(
        "player_a,player_b,singles_results!singles_games_result_id_fkey(kind,winner)",
      )
      .eq("id", next)
      .single();
    check(retired);
    expect(retired.data?.singles_results).toEqual({
      kind: "withdrawal",
      winner: "b",
    });
    const roster = await f.admin
      .from("roster_memberships")
      .select("player_id")
      .in("player_id", [retired.data!.player_a, retired.data!.player_b])
      .is("ended_at", null);
    check(roster);
    expect(roster.data).toHaveLength(2);
    const states = await f.admin
      .from("players")
      .select("status")
      .in("id", [retired.data!.player_a, retired.data!.player_b]);
    check(states);
    expect(states.data!.every((p) => p.status === "active")).toBe(true);
    const calculations = await f.admin
      .from("rating_calculations")
      .select("id")
      .eq("game_id", next);
    check(calculations);
    expect(calculations.data).toHaveLength(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(pageErrors).toEqual([]);
  } finally {
    await context.setOffline(false);
    await trainer.auth.signOut();
    await f.cleanup();
  }
});
