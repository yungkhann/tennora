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
test.use({ actionTimeout: 15000 });
test("transfer between hidden submissions reveals atomically and an official repairs the unstarted pairing", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const f = await drawFixture({ knockoutSize: 2 });
  const a = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ),
    b = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  const check = (r: { error: unknown }) => expect(r.error).toBeNull();
  try {
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
    const m = await f.admin
      .from("team_matches")
      .select("id,subteam_a,subteam_b")
      .eq("draw_id", draw)
      .single();
    check(m);
    const match = m.data!;
    const subs = await f.admin
      .from("subteams")
      .select("id,team_id,teams(name)")
      .in("id", [match.subteam_a!, match.subteam_b!]);
    check(subs);
    const subA = subs.data!.find((s) => s.id === match.subteam_a)!,
      subB = subs.data!.find((s) => s.id === match.subteam_b)!;
    const people = await f.admin
      .from("players")
      .select("id,gender,team_id")
      .in("team_id", [subA.team_id, subB.team_id]);
    check(people);
    function ordered(club: string) {
      const boys = people.data!.filter(
          (p) => p.team_id === club && p.gender === "boy",
        ),
        girls = people.data!.filter(
          (p) => p.team_id === club && p.gender === "girl",
        );
      return [boys[0].id, girls[0].id, boys[1].id, girls[1].id, boys[2].id];
    }
    const playersA = ordered(subA.team_id),
      playersB = ordered(subB.team_id),
      reserve = randomUUID();
    f.players.push(reserve);
    check(
      await f.operator.rpc("save_player", {
        player_id: reserve,
        club: subA.team_id,
        first_name: "Transfer",
        last_name: "Reserve",
        gender: "boy",
        dob: "2014-01-01",
        hand: "right",
        style: "attack",
        sports_level: "junior",
      }),
    );
    check(
      await f.operator.rpc("add_roster_player", {
        parent_season: f.season,
        target_subteam: subA.id,
        player: reserve,
      }),
    );
    const emailB = `transfer-b-${f.token}@example.test`;
    const created = await f.admin.auth.admin.createUser({
      email: emailB,
      password: f.password,
      email_confirm: true,
      user_metadata: { display_name: "Transfer Trainer B" },
    });
    check(created);
    const userB = created.data.user!.id;
    f.users.push(userB);
    check(
      await f.admin.from("staff_accounts").insert({
        id: userB,
        email: emailB,
        display_name: "Transfer Trainer B",
      }),
    );
    check(
      await f.admin
        .from("staff_roles")
        .insert({ user_id: userB, role: "trainer" }),
    );
    check(
      await f.operator.rpc("assign_team_trainer", {
        trainer: f.users[2],
        club: subA.team_id,
        coached_subteams: [subA.id],
      }),
    );
    check(
      await f.operator.rpc("assign_team_trainer", {
        trainer: userB,
        club: subB.team_id,
        coached_subteams: [subB.id],
      }),
    );
    check(
      await a.auth.signInWithPassword({
        email: f.emails[2],
        password: f.password,
      }),
    );
    check(
      await b.auth.signInWithPassword({ email: emailB, password: f.password }),
    );
    check(
      await a.rpc("submit_lineup", {
        lineup_id: randomUUID(),
        match: match.id,
        subteam: subA.id,
        players: playersA,
      }),
    );
    check(
      await f.operator.rpc("transfer_player", {
        player: playersA[0],
        new_club: subB.team_id,
        reason: "Organizer-approved season transfer",
      }),
    );
    check(
      await f.operator.rpc("add_roster_player", {
        parent_season: f.season,
        target_subteam: subB.id,
        player: playersA[0],
      }),
    );
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page.goto(`/en/matches/${match.id}/lineup`);
    await expect(
      page.getByText(
        "Player selections stay hidden until both teams submit. Officials see submission status only.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "A transfer left the same player on both sides. An official can choose an eligible reserve before the match starts.",
        { exact: true },
      ),
    ).toHaveCount(0);
    const submitted = await b.rpc("submit_lineup", {
      lineup_id: randomUUID(),
      match: match.id,
      subteam: subB.id,
      players: [playersA[0], ...playersB.slice(1)],
    });
    check(submitted);
    await expect(
      page.getByText(
        "A transfer left the same player on both sides. An official can choose an eligible reserve before the match starts.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 12000 });
    const games = await f.admin
      .from("singles_games")
      .select("slot,status,player_a,player_b")
      .eq("match_id", match.id);
    check(games);
    expect(games.data).toHaveLength(5);
    expect(
      games.data!.filter(
        (g) => g.status === "cancelled" && g.player_a === g.player_b,
      ),
    ).toHaveLength(1);
    const card = page
      .getByRole("heading", { name: subA.teams.name, exact: true })
      .locator("..");
    await card
      .locator("summary")
      .filter({ hasText: "Replace locked player" })
      .click();
    const replace = card.getByRole("form", {
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
      .fill("Eligible reserve after approved transfer");
    await replace
      .getByRole("button", { name: "Replace locked player", exact: true })
      .click();
    await expect(
      card.getByText("1. Transfer Reserve · Boy", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "A transfer left the same player on both sides. An official can choose an eligible reserve before the match starts.",
        { exact: true },
      ),
    ).toHaveCount(0);
    const repaired = await f.admin
      .from("singles_games")
      .select("status,player_a,player_b")
      .eq("match_id", match.id)
      .eq("slot", 1)
      .single();
    check(repaired);
    expect(repaired.data).toEqual({
      status: "pending",
      player_a: reserve,
      player_b: playersA[0],
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await card.screenshot({ path: testInfo.outputPath("transfer-repair.png") });
  } finally {
    await a.auth.signOut();
    await b.auth.signOut();
    await f.cleanup();
  }
});
