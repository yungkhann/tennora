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
test("official reviews a correction and atomically applies its saved-K result", async ({
  page,
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
        reason: "Browser scoring fixture",
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
          reason: "Browser scoring fixture",
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
        command_id: randomUUID(),
        game,
        kind: "start",
        side: "a",
        expected_version: 0,
      }),
    );
    for (let i = 0; i < 33; i++)
      check(
        await judge.rpc("score_command", {
          command_id: randomUUID(),
          game,
          kind: "point",
          side: "a",
          expected_version: i + 1,
        }),
      );
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    const response = await page.goto(`/en/matches/${m.id}/corrections`);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await page.getByLabel("1 B", { exact: true }).fill("2");
    await page
      .getByLabel("Reason", { exact: true })
      .fill("Correct the recorded opening set");
    await page
      .getByRole("button", { name: "Review correction", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Correction review", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("11:2 / 11:0 / 11:0", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("correction-review.png"),
      fullPage: true,
    });
    await page
      .getByLabel("Reason", { exact: true })
      .fill("Reviewed against the score sheet");
    await page
      .getByLabel("I reviewed the proposed result and its effects.", {
        exact: true,
      })
      .check();
    await page
      .getByRole("button", { name: "Apply reviewed correction", exact: true })
      .click();
    await expect(
      page.getByText(
        "Correction applied. Ratings and dependent matches were updated together.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Applied correction", exact: true }),
    ).toBeVisible();
    const saved = await f.admin
      .from("singles_games")
      .select(
        "result_revision,singles_results!singles_games_result_id_fkey(points_b,k_factor)",
      )
      .eq("id", game)
      .single();
    check(saved);
    expect(saved.data?.result_revision).toBe(2);
    expect(saved.data?.singles_results?.points_b).toBe(2);
    expect(saved.data?.singles_results?.k_factor).toBe(32);
    for (const [locale, title] of [
      ["ru", "Исправление применено"],
      ["kk", "Түзету қолданылды"],
    ]) {
      await page.goto(
        page
          .url()
          .replace(/\/(en|ru|kk)\/corrections\//, `/${locale}/corrections/`),
      );
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
    }
    expect(pageErrors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await judge.auth.signOut();
  } finally {
    await trainer.auth.signOut();
    await f.cleanup();
  }
});

test("official corrects a team forfeit and reopens a fresh match without fabricated singles", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const f = await drawFixture({
    knockoutSize: 2,
    currentDay: true,
    tables: 128,
  });
  const check = (r: { error: unknown }) => expect(r.error).toBeNull();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  try {
    check(
      await f.admin
        .from("staff_roles")
        .insert({ user_id: f.users[0], role: "trainer" }),
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
    const match = await f.admin
      .from("team_matches")
      .select("id,subteam_a")
      .eq("draw_id", draw)
      .single();
    check(match);
    const m = match.data!;
    const sub = await f.admin
      .from("subteams")
      .select("team_id")
      .eq("id", m.subteam_a!)
      .single();
    check(sub);
    check(
      await f.operator.rpc("assign_team_trainer", {
        trainer: f.users[0],
        club: sub.data!.team_id,
        coached_subteams: [m.subteam_a!],
      }),
    );
    const players = await f.admin
      .from("players")
      .select("id,gender")
      .eq("team_id", sub.data!.team_id);
    check(players);
    const boys = players.data!.filter((p) => p.gender === "boy"),
      girls = players.data!.filter((p) => p.gender === "girl");
    check(
      await f.operator.rpc("submit_lineup", {
        lineup_id: randomUUID(),
        match: m.id,
        subteam: m.subteam_a!,
        players: [boys[0].id, girls[0].id, boys[1].id, girls[1].id, boys[2].id],
      }),
    );
    for (const [operation, version] of [
      ["assign", 1],
      ["start", 2],
    ] as const)
      check(
        await f.operator.rpc("manage_match", {
          command_id: randomUUID(),
          match: m.id,
          operation,
          table_no:
            operation === "assign"
              ? testInfo.project.name === "mobile"
                ? 128
                : 127
              : null!,
          expected_version: version,
          reason: "One team cannot field a lineup",
        }),
      );
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    const response = await page.goto(`/en/matches/${m.id}/corrections`);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    const revise = page
      .getByRole("heading", {
        name: "Correct team-forfeit winner",
        exact: true,
      })
      .locator("..")
      .getByRole("form");
    await revise
      .getByRole("combobox", { name: "Winner", exact: true })
      .selectOption("b");
    await revise
      .getByLabel("Reason", { exact: true })
      .fill("The absent side was entered incorrectly");
    await revise
      .getByRole("button", { name: "Review correction", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Correction review", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Reason", { exact: true })
      .fill("Reviewed the forfeit record");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Apply reviewed correction", exact: true })
      .click();
    await expect(
      page.getByText(
        "Correction applied. Ratings and dependent matches were updated together.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.goto(`/en/matches/${m.id}/corrections`);
    const reopen = page
      .getByRole("heading", {
        name: "Reopen team forfeit for play",
        exact: true,
      })
      .locator("..")
      .getByRole("form");
    await reopen
      .getByLabel("Reason", { exact: true })
      .fill("Both teams can play after the review");
    await reopen
      .getByRole("button", { name: "Review correction", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Correction review", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Preserve the forfeit and create a fresh match requiring new lineups. Review affected matches before applying.",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByLabel("Reason", { exact: true })
      .fill("Approved fresh play and new lineups");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Apply reviewed correction", exact: true })
      .click();
    const fresh = page.getByRole("link", {
      name: "Open fresh match lineups",
      exact: true,
    });
    await expect(fresh).toBeVisible();
    const saved = await f.admin
      .from("team_matches")
      .select("superseded_by,result_revision")
      .eq("id", m.id)
      .single();
    check(saved);
    expect(saved.data?.result_revision).toBe(2);
    expect(saved.data?.superseded_by).toBeTruthy();
    const newMatch = saved.data!.superseded_by!;
    expect(await fresh.getAttribute("href")).toBe(
      `/en/matches/${newMatch}/lineup`,
    );
    const lineups = await f.admin
      .from("lineups")
      .select("id")
      .eq("match_id", newMatch);
    check(lineups);
    expect(lineups.data).toHaveLength(0);
    await fresh.click();
    await expect(page).toHaveURL(new RegExp(`/en/matches/${newMatch}/lineup$`));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const locale of ["ru", "kk"]) {
      await page.goto(`/${locale}/matches/${newMatch}/lineup`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(pageErrors).toEqual([]);
  } finally {
    await f.cleanup();
  }
});
