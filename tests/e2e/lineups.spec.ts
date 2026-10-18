import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { test, expect, type Page } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
import { drawFixture } from "./helpers/draw-fixture";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL;
test.skip(
  !backend ||
    new URL(backend).hostname !== "127.0.0.1" ||
    !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  "Local disposable fixtures required.",
);
test.use({ actionTimeout: 15000 });
async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
}
test("Trainers lock hidden lineups; officials and opponents cannot read them; joint reveal refreshes and a pending player can be replaced", async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.setTimeout(120000);
  const f = await drawFixture(),
    aContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
      viewport: page.viewportSize() ?? { width: 1280, height: 720 },
    }),
    bContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000" }),
    emailB = `lineup-b-${f.token}@example.test`;
  const judgeClient = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ),
    trainerClient = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  try {
    const created = await f.admin.auth.admin.createUser({
      email: emailB,
      password: f.password,
      email_confirm: true,
      user_metadata: { display_name: "Trainer B" },
    });
    expect(created.error).toBeNull();
    const userB = created.data.user!.id;
    f.users.push(userB);
    expect(
      (
        await f.admin
          .from("staff_accounts")
          .insert({ id: userB, email: emailB, display_name: "Trainer B" })
      ).error,
    ).toBeNull();
    expect(
      (
        await f.admin.from("staff_roles").insert([
          { user_id: userB, role: "trainer" },
          { user_id: userB, role: "main_judge" },
        ])
      ).error,
    ).toBeNull();
    const draw = randomUUID();
    expect(
      (
        await f.operator.rpc("generate_tour_draw", {
          draw_id: draw,
          tournament: f.tour,
          age: "U13",
          expected_revision: 0,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await f.operator.rpc("publish_tour_draw", {
          draw,
          expected_revision: 1,
        })
      ).error,
    ).toBeNull();
    const matchResult = await f.admin
      .from("team_matches")
      .select("id,subteam_a,subteam_b")
      .eq("draw_id", draw)
      .not("subteam_a", "is", null)
      .limit(1)
      .single();
    expect(matchResult.error).toBeNull();
    const match = matchResult.data!;
    const subs = await f.admin
      .from("subteams")
      .select("id,team_id,teams(name)")
      .in("id", [match.subteam_a!, match.subteam_b!]);
    expect(subs.error).toBeNull();
    const aSub = subs.data!.find((s) => s.id === match.subteam_a)!,
      bSub = subs.data!.find((s) => s.id === match.subteam_b)!;
    expect(
      (
        await f.operator.rpc("assign_team_trainer", {
          trainer: f.users[2],
          club: aSub.team_id,
          coached_subteams: [aSub.id],
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await f.operator.rpc("assign_team_trainer", {
          trainer: userB,
          club: bSub.team_id,
          coached_subteams: [bSub.id],
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await f.admin
          .from("players")
          .update({ first_name: `Alpha ${f.token}` })
          .eq("team_id", aSub.team_id)
      ).error,
    ).toBeNull();
    expect(
      (
        await f.admin
          .from("players")
          .update({ first_name: `Bravo ${f.token}` })
          .eq("team_id", bSub.team_id)
      ).error,
    ).toBeNull();
    const players = await f.admin
      .from("players")
      .select("id,team_id,gender,last_name")
      .in("team_id", [aSub.team_id, bSub.team_id]);
    expect(players.error).toBeNull();
    function ordered(club: string) {
      const roster = players
          .data!.filter((p) => p.team_id === club)
          .sort((a, b) => a.last_name.localeCompare(b.last_name)),
        boys = roster.filter((p) => p.gender === "boy"),
        girls = roster.filter((p) => p.gender === "girl");
      return [boys[0].id, girls[0].id, boys[1].id, girls[1].id, boys[2].id];
    }
    const aPlayers = ordered(aSub.team_id),
      bPlayers = ordered(bSub.team_id),
      reserve = randomUUID();
    f.players.push(reserve);
    expect(
      (
        await f.operator.rpc("save_player", {
          player_id: reserve,
          club: aSub.team_id,
          first_name: `Reserve ${f.token}`,
          last_name: "Boy",
          gender: "boy",
          dob: "2014-01-01",
          hand: "right",
          style: "attack",
          sports_level: "junior",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await f.operator.rpc("add_roster_player", {
          parent_season: f.season,
          target_subteam: aSub.id,
          player: reserve,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await judgeClient.auth.signInWithPassword({
          email: f.emails[1],
          password: f.password,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await trainerClient.auth.signInWithPassword({
          email: f.emails[2],
          password: f.password,
        })
      ).error,
    ).toBeNull();
    const aPage = await aContext.newPage(),
      bPage = await bContext.newPage();
    await login(page, f.emails[1], f.password);
    await login(aPage, f.emails[2], f.password);
    await login(bPage, emailB, f.password);
    await aPage
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Matches", exact: true })
      .click();
    await expect(
      aPage.getByText(aSub.teams.name, { exact: false }).first(),
    ).toBeVisible();
    const route = `/en/matches/${match.id}/lineup`;
    await page.goto(route);
    await aPage.goto(route);
    await bPage.goto(route);
    expect(
      (
        await request.get(`/api/staff/matches/${match.id}/lineup-status`)
      ).status(),
    ).toBe(401);
    const submitA = aPage.getByRole("form", {
      name: "Submit and lock lineup",
      exact: true,
    });
    for (let i = 0; i < 5; i++)
      await submitA.getByRole("combobox").nth(i).selectOption(aPlayers[i]);
    await submitA.getByRole("checkbox").check();
    await submitA
      .getByRole("button", { name: "Submit and lock lineup", exact: true })
      .click();
    await expect(
      aPage.getByText("Lineup submitted and locked", { exact: true }),
    ).toBeVisible();
    await expect(aPage.locator("body")).toContainText(`Alpha ${f.token}`);
    await expect(aPage.locator("body")).not.toContainText(`Bravo ${f.token}`);
    await expect(
      page.getByText("Lineup submitted and locked", { exact: true }),
    ).toBeVisible({ timeout: 12000 });
    await expect(page.locator("body")).not.toContainText(`Alpha ${f.token}`);
    await expect(page.locator("body")).not.toContainText(`Bravo ${f.token}`);
    await expect(bPage.locator("body")).not.toContainText(`Alpha ${f.token}`);
    expect(
      (
        await judgeClient
          .from("lineups")
          .select("id,original_players")
          .eq("match_id", match.id)
      ).data,
    ).toEqual([]);
    const ownHeader = await f.admin
      .from("lineups")
      .select("id")
      .eq("match_id", match.id)
      .eq("subteam_id", aSub.id)
      .single();
    expect(ownHeader.error).toBeNull();
    expect(
      (
        await judgeClient
          .from("lineup_slots")
          .select("player_id,player_name")
          .eq("lineup_id", ownHeader.data!.id)
      ).data,
    ).toEqual([]);
    const privateStatus = await page.request.get(
      `/api/staff/matches/${match.id}/lineup-status`,
    );
    expect(privateStatus.headers()["cache-control"]).toContain(
      "private, no-store",
    );
    const statusText = await privateStatus.text();
    for (const id of [...aPlayers, ...bPlayers])
      expect(statusText).not.toContain(id);
    expect(statusText).not.toContain("original_players");
    await page.screenshot({
      path: testInfo.outputPath("official-hidden-lineup.png"),
      fullPage: true,
    });
    const submitB = bPage.getByRole("form", {
      name: "Submit and lock lineup",
      exact: true,
    });
    for (let i = 0; i < 5; i++)
      await submitB.getByRole("combobox").nth(i).selectOption(bPlayers[i]);
    await submitB.getByRole("checkbox").check();
    await submitB
      .getByRole("button", { name: "Submit and lock lineup", exact: true })
      .click();
    await expect(
      page.getByText("Both lineups are revealed.", { exact: true }),
    ).toBeVisible({ timeout: 12000 });
    await expect(
      aPage.getByText("Both lineups are revealed.", { exact: true }),
    ).toBeVisible({ timeout: 12000 });
    await expect(aPage.locator("body")).toContainText(`Bravo ${f.token}`);
    const aCard = page
      .getByRole("heading", { name: aSub.teams.name, exact: true })
      .locator("..");
    await aCard
      .locator("summary")
      .filter({ hasText: "Replace locked player" })
      .click();
    const replace = aCard.getByRole("form", {
      name: "Replace locked player",
      exact: true,
    });
    await replace
      .getByRole("combobox", { name: "Slot", exact: true })
      .selectOption("1");
    await replace
      .getByRole("combobox", { name: "Replacement player", exact: true })
      .selectOption(reserve);
    await replace
      .getByLabel("Reason", { exact: true })
      .fill("Pre-game reserve approved");
    await replace
      .getByRole("button", { name: "Replace locked player", exact: true })
      .click();
    await expect(
      replace.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await expect(
      replace.getByRole("combobox", {
        name: "Replacement player",
        exact: true,
      }),
    ).toHaveValue("");
    await expect(
      aPage.getByText(`1. Reserve ${f.token} Boy · Boy`, { exact: true }),
    ).toBeVisible({ timeout: 12000 });
    const original = await f.admin
      .from("lineups")
      .select("id,original_players")
      .eq("match_id", match.id)
      .eq("subteam_id", aSub.id)
      .single();
    expect(original.data?.original_players).toEqual(aPlayers);
    expect(
      (
        await trainerClient.rpc("submit_lineup", {
          lineup_id: original.data!.id,
          match: match.id,
          subteam: aSub.id,
          players: aPlayers,
        })
      ).error,
    ).toBeNull();
    const games = await f.admin
      .from("singles_games")
      .select("slot,player_a")
      .eq("match_id", match.id);
    expect(games.data).toHaveLength(5);
    expect(games.data?.find((g) => g.slot === 1)?.player_a).toBe(reserve);
    await aCard
      .locator("summary")
      .filter({ hasText: "Replacement history" })
      .click();
    await expect(
      aCard.getByText("Pre-game reserve approved", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("revealed-replacement.png"),
      fullPage: true,
    });
  } finally {
    test.setTimeout(120000);
    await aContext.close();
    await bContext.close();
    await judgeClient.auth.signOut();
    await trainerClient.auth.signOut();
    await f.cleanup();
  }
});
