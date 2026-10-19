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
test("anonymous public scoring receives committed Realtime, polling fallback and reconnect recovery", async ({
  page,
  context,
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
    const judge = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    check(
      await judge.auth.signInWithPassword({
        email: f.emails[1],
        password: f.password,
      }),
    );
    check(
      await judge.rpc("score_command", {
        confirmed: true,
        command_id: randomUUID(),
        game,
        kind: "start",
        side: "a",
        expected_version: 0,
      }),
    );
    const player = ordered(m.subteam_a!)[0];
    await page.goto(`/en/live/${m.id}`);
    await expect(
      page
        .getByRole("status", { name: "" })
        .filter({ hasText: "Live connection" }),
    ).toBeVisible({ timeout: 15000 });
    expect(
      (await context.cookies()).some((c) => c.name.startsWith("sb-")),
    ).toBe(false);
    const original = await (
      await page.request.get(`/api/public/matches/${m.id}`)
    ).json();
    expect(JSON.stringify(original)).not.toMatch(
      /date_of_birth|actor_id|submitted_by|consent|email/,
    );
    await page.route("**/api/public/matches/**", (route) => route.abort());
    check(
      await judge.rpc("score_command", {
        confirmed: true,
        command_id: randomUUID(),
        game,
        kind: "point",
        side: "a",
        expected_version: 1,
      }),
    );
    await expect(page.getByText("1 : 0", { exact: true })).toBeVisible({
      timeout: 3000,
    });
    await page.unroute("**/api/public/matches/**");
    // A new page with its WebSocket blocked exercises the actual HTTP fallback.
    await page.routeWebSocket("**/realtime/v1/websocket**", (socket) =>
      socket.close(),
    );
    await page.reload();
    check(
      await judge.rpc("score_command", {
        confirmed: true,
        command_id: randomUUID(),
        game,
        kind: "point",
        side: "b",
        expected_version: 2,
      }),
    );
    await expect(page.getByText("1 : 1", { exact: true })).toBeVisible({
      timeout: 8000,
    });
    await context.setOffline(true);
    await expect(
      page.getByRole("status").filter({ hasText: "Connection lost" }),
    ).toBeVisible();
    check(
      await judge.rpc("score_command", {
        confirmed: true,
        command_id: randomUUID(),
        game,
        kind: "point",
        side: "a",
        expected_version: 3,
      }),
    );
    await context.setOffline(false);
    await expect(page.getByText("2 : 1", { exact: true })).toBeVisible({
      timeout: 8000,
    });
    await page.route("**/api/public/matches/**", (route) =>
      route.fulfill({ json: original }),
    );
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByText("2 : 1", { exact: true })).toBeVisible();
    await page.unroute("**/api/public/matches/**");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({
      path: testInfo.outputPath("public-live.png"),
      fullPage: true,
    });
    await page.goto(`/en/player/${player}`);
    await expect(
      page.getByRole("heading", {
        name: "Match and rating history",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(`/en/season/${f.season}`);
    await expect(
      page.getByText("Provisional: some tournaments are not finalized.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(`/en/tournament/${f.tour}/draws/${draw}`);
    await expect(
      page.getByRole("heading", { name: "Draws · U13", exact: true }),
    ).toBeVisible();
    await page.goto("/en/ranking");
    await page
      .getByLabel("Search by player or club", { exact: true })
      .fill(`Draw Club ${f.token}`);
    await page
      .getByRole("button", { name: "Apply filters", exact: true })
      .click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.goto(`/en/live/${m.id}`);
    const languageMenu = page.locator(".site-header summary");
    if (await languageMenu.isVisible()) await languageMenu.click();
    await page.getByRole("link", { name: "KK", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/kk/live/${m.id}$`));
    await expect(page.getByRole("heading", { name: /Матч/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const cached = await page.evaluate(async () => {
      const registration =
        await navigator.serviceWorker.register("/league-sw.js");
      await navigator.serviceWorker.ready;
      await fetch("/api/public/matches");
      await fetch("/api/staff/judge-desk");
      const cache = await caches.open("tennora-public-shell-v1"),
        urls = (await cache.keys()).map((r) => new URL(r.url).pathname);
      await registration.unregister();
      return urls;
    });
    expect(cached.sort()).toEqual(
      [
        "/icon.svg",
        "/league-icon-192.png",
        "/league-icon-512.png",
        "/manifest.webmanifest",
      ].sort(),
    );
    // Finish the played singles, then leave the roster. Public history and
    // metadata must remain accessible without putting the player back in ranking.
    for (let i = 0; i < 31; i++)
      check(
        await judge.rpc("score_command", {
          confirmed: true,
          command_id: randomUUID(),
          game,
          kind: "point",
          side: "a",
          expected_version: i + 4,
        }),
      );
    check(
      await f.operator.rpc("drop_player", {
        player,
        effective_date: today,
        confirmed: true,
      }),
    );
    const current = await f.admin
      .from("public_league_players")
      .select("id")
      .eq("id", player);
    check(current);
    expect(current.data).toHaveLength(0);
    for (const locale of ["en", "ru", "kk"]) {
      const response = await page.goto(`/${locale}/player/${player}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Seed",
      );
      await expect(page.getByRole("table")).toBeVisible();
      expect(await page.title()).toContain("Seed");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(pageErrors).toEqual([]);
    await judge.auth.signOut();
  } finally {
    await trainer.auth.signOut();
    await f.cleanup();
  }
});
