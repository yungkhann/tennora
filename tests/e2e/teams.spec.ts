import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { test, expect, type Page } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
test.use({ actionTimeout: 15000 });
test.skip(
  !backend || new URL(backend).hostname !== "127.0.0.1" || !key,
  "Requires local disposable Supabase fixtures.",
);
async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
}
test("club staff create, roster, transfer and drop a player with private history and club isolation", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const token = randomUUID().slice(0, 8),
    password = `Club!${randomUUID()}`,
    emails = [
      `club-org-${token}@example.test`,
      `club-coach-a-${token}@example.test`,
      `club-coach-b-${token}@example.test`,
    ];
  const admin = createClient<Database>(backend!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    operator = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  const users: string[] = [],
    clubs: string[] = [];
  const season = randomUUID();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    viewport: page.viewportSize() ?? { width: 1280, height: 720 },
  });
  try {
    for (let i = 0; i < 3; i++) {
      const result = await admin.auth.admin.createUser({
        email: emails[i],
        password,
        email_confirm: true,
        user_metadata: {
          display_name: i === 0 ? "Club Organizer" : `Coach ${i} ${token}`,
        },
      });
      expect(result.error).toBeNull();
      const id = result.data.user!.id;
      users.push(id);
      expect(
        (
          await admin.from("staff_accounts").insert({
            id,
            email: emails[i],
            display_name: i === 0 ? "Club Organizer" : `Coach ${i} ${token}`,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("staff_roles")
            .insert({ user_id: id, role: i === 0 ? "organizer" : "trainer" })
        ).error,
      ).toBeNull();
    }
    expect(
      (await operator.auth.signInWithPassword({ email: emails[0], password }))
        .error,
    ).toBeNull();
    await login(page, emails[0], password);
    await page.getByRole("link", { name: "Clubs", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/team$/);
    const createClub = page.getByRole("form", {
      name: "Create club",
      exact: true,
    });
    await createClub
      .getByLabel("Name", { exact: true })
      .fill(`E2E Club ${token} A`);
    await createClub.getByLabel("Region").fill("Almaty");
    await createClub
      .getByRole("button", { name: "Create club", exact: true })
      .click();
    await expect(
      createClub.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    const first = await admin
      .from("teams")
      .select("id")
      .eq("name", `E2E Club ${token} A`)
      .single();
    expect(first.error).toBeNull();
    clubs.push(first.data!.id);
    clubs.push(randomUUID());
    expect(
      (
        await operator.rpc("save_team", {
          team_id: clubs[1],
          team_name: `E2E Club ${token} B`,
          team_region: "Astana",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await operator.rpc("save_season", {
          season_id: season,
          season_name: `Club Season ${token}`,
          season_year: 2026,
          first_day: "2026-01-01",
          last_day: "2026-12-31",
        })
      ).error,
    ).toBeNull();
    await page.goto(`/en/team/${clubs[0]}`);
    const registration = page.getByRole("form", {
      name: "Register club in season",
      exact: true,
    });
    await registration.getByLabel("Seasons").selectOption(season);
    await registration
      .getByRole("button", { name: "Register club in season", exact: true })
      .click();
    await expect(
      page.getByText(`Club Season ${token}`, { exact: true }),
    ).toBeVisible();
    const assign = page.getByRole("form", {
      name: "Assign trainer",
      exact: true,
    });
    await assign
      .getByRole("combobox", { name: "Trainer", exact: true })
      .selectOption(users[1]);
    await assign
      .getByRole("button", { name: "Assign trainer", exact: true })
      .click();
    await expect(
      assign.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    expect(
      (
        await operator.rpc("register_season_team", {
          parent_season: season,
          club: clubs[1],
        })
      ).error,
    ).toBeNull();
    const subteams = await admin
      .from("subteams")
      .select("id,team_id,age_group")
      .in("team_id", clubs);
    expect(subteams.error).toBeNull();
    const secondSubs = subteams.data!.filter((s) => s.team_id === clubs[1]);
    expect(
      (
        await operator.rpc("assign_team_trainer", {
          trainer: users[2],
          club: clubs[1],
          coached_subteams: secondSubs.map((s) => s.id),
        })
      ).error,
    ).toBeNull();
    const coach = await context.newPage();
    await login(coach, emails[1], password);
    await coach.goto(`/en/team/${clubs[0]}`);
    await expect(
      coach.getByRole("heading", { name: `E2E Club ${token} A`, exact: true }),
    ).toBeVisible();
    const create = coach.getByRole("form", {
      name: "Create player",
      exact: true,
    });
    await create.getByLabel("First name", { exact: true }).fill("Young");
    await create
      .getByLabel("Last name", { exact: true })
      .fill(`Player ${token}`);
    await create
      .getByRole("combobox", { name: "Gender", exact: true })
      .selectOption("boy");
    await create
      .getByLabel("Date of birth", { exact: false })
      .fill("2014-06-15");
    await create.getByLabel("Playing hand").selectOption("right");
    await create.getByLabel("Playing style").fill("Attack");
    await create.getByLabel("Sports level").fill("Junior");
    await create
      .getByRole("button", { name: "Create player", exact: true })
      .click();
    await expect(
      create.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    const person = await admin
      .from("players")
      .select("id,current_rating")
      .eq("team_id", clubs[0])
      .single();
    expect(person.error).toBeNull();
    const player = person.data!.id;
    expect(person.data!.current_rating).toBe(1000);
    const personCard = coach
      .getByRole("heading", { name: `Young Player ${token}`, exact: true })
      .locator("..");
    await personCard
      .locator("summary")
      .filter({ hasText: "Trainer references" })
      .click();
    const trainerRef = personCard.getByRole("form", {
      name: "Save trainer reference",
      exact: true,
    });
    await trainerRef.getByLabel("Linked trainer").selectOption(users[1]);
    await trainerRef
      .getByRole("button", { name: "Save trainer reference", exact: true })
      .click();
    await expect(
      trainerRef.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    const ownU13 = subteams.data!.find(
      (s) => s.team_id === clubs[0] && s.age_group === "U13",
    )!.id;
    await coach.goto(`/en/subteam/${ownU13}?seasonId=${season}`);
    const roster = coach.getByRole("form", {
      name: "Add to roster",
      exact: true,
    });
    await roster
      .getByRole("combobox", { name: "Players", exact: true })
      .selectOption(player);
    await roster
      .getByRole("button", { name: "Add to roster", exact: true })
      .click();
    await expect(
      coach.getByRole("heading", {
        name: `Young Player ${token}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(coach.getByText(/Active: 1\/10/)).toBeVisible();
    expect(
      await coach.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await coach.screenshot({
      path: testInfo.outputPath("roster.png"),
      fullPage: true,
    });
    await coach.goto(`/en/team/${clubs[1]}`);
    await expect(
      coach.getByRole("heading", { name: /This page isn.t available/ }),
    ).toBeVisible();
    await page.goto(`/en/team/${clubs[0]}`);
    const transfer = page
      .getByRole("heading", { name: `Young Player ${token}`, exact: true })
      .locator("..");
    await transfer
      .locator("summary")
      .filter({ hasText: "Approve transfer" })
      .click();
    const move = transfer.getByRole("form", {
      name: "Approve transfer",
      exact: true,
    });
    await move.getByLabel("Receiving club").selectOption(clubs[1]);
    await move.getByLabel("Reason").fill("Organizer-approved move");
    await move
      .getByRole("button", { name: "Approve transfer", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `Young Player ${token}`, exact: true }),
    ).toHaveCount(0);
    await coach.goto(`/en/team/${clubs[0]}`);
    await expect(
      coach.getByRole("heading", {
        name: `Young Player ${token}`,
        exact: true,
      }),
    ).toHaveCount(0);
    const receiver = await context.newPage();
    await login(receiver, emails[2], password);
    await receiver.goto(`/en/team/${clubs[1]}`);
    await expect(
      receiver.getByRole("heading", {
        name: `Young Player ${token}`,
        exact: true,
      }),
    ).toBeVisible();
    const target = secondSubs.find((s) => s.age_group === "U13")!.id;
    await receiver.goto(`/en/subteam/${target}?seasonId=${season}`);
    const targetRoster = receiver.getByRole("form", {
      name: "Add to roster",
      exact: true,
    });
    await targetRoster
      .getByRole("combobox", { name: "Players", exact: true })
      .selectOption(player);
    await targetRoster
      .getByRole("button", { name: "Add to roster", exact: true })
      .click();
    await expect(
      receiver.getByRole("heading", {
        name: `Young Player ${token}`,
        exact: true,
      }),
    ).toBeVisible();
    const history = await admin
      .from("roster_memberships")
      .select("ended_at")
      .eq("player_id", player);
    expect(history.data).toHaveLength(2);
    expect(history.data!.filter((m) => m.ended_at)).toHaveLength(1);
    await receiver.goto(`/en/team/${clubs[1]}`);
    const dropped = receiver
      .getByRole("heading", { name: `Young Player ${token}`, exact: true })
      .locator("..");
    await dropped
      .locator("summary")
      .filter({ hasText: "Mark dropped out" })
      .click();
    const drop = dropped.getByRole("form", {
      name: "Mark dropped out",
      exact: true,
    });
    await drop
      .getByLabel("Effective date")
      .fill(new Date().toISOString().slice(0, 10));
    await drop.getByLabel("Reason").fill("Injury");
    await drop
      .getByRole("button", { name: "Mark dropped out", exact: true })
      .click();
    await expect(
      dropped.getByText("Rating: 1000 · Dropped out", { exact: true }),
    ).toBeVisible();
    expect(
      (
        await admin
          .from("player_status_events")
          .select("id")
          .eq("player_id", player)
      ).data,
    ).toHaveLength(1);
    expect(
      (await admin.from("rating_history").select("id").eq("player_id", player))
        .data,
    ).toHaveLength(1);
    expect(
      (
        await operator.rpc("add_roster_player", {
          parent_season: season,
          target_subteam: target,
          player,
        })
      ).error?.message,
    ).toBe("Eligible active club player required");
  } finally {
    testInfo.setTimeout(testInfo.timeout + 30000);
    await context.close().catch(() => {});
    const people = clubs.length
      ? ((await admin.from("players").select("id").in("team_id", clubs)).data ??
        [])
      : [];
    const peopleIds = people.map((p) => p.id);
    if (peopleIds.length) {
      await admin
        .from("player_trainer_refs")
        .delete()
        .in("player_id", peopleIds);
      await admin
        .from("player_status_events")
        .delete()
        .in("player_id", peopleIds);
      await admin
        .from("roster_memberships")
        .delete()
        .in("player_id", peopleIds);
      await admin.from("rating_history").delete().in("player_id", peopleIds);
      await admin.from("players").delete().in("id", peopleIds);
    }
    await admin.from("subteam_trainers").delete().in("trainer_id", users);
    await admin.from("trainer_profiles").delete().in("user_id", users);
    await admin.from("season_team_entries").delete().eq("season_id", season);
    if (clubs.length) {
      await admin.from("subteams").delete().in("team_id", clubs);
      await admin.from("teams").delete().in("id", clubs);
    }
    await admin.from("seasons").delete().eq("id", season);
    await admin.from("audit_logs").delete().in("actor_id", users);
    await admin.from("staff_roles").delete().in("user_id", users);
    await admin.from("staff_accounts").delete().in("id", users);
    for (const id of users)
      expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});
