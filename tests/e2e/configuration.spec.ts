import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL,
  secret = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
test.skip(
  !backend || new URL(backend).hostname !== "127.0.0.1" || !secret,
  "Local disposable fixtures required.",
);
test.use({ actionTimeout: 15000 });
test("Organizer configures the confirmed stages, checks readiness, starts and changes only future K", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const token = randomUUID().slice(0, 8),
    password = `Config!${randomUUID()}`,
    email = `config-${token}@example.test`,
    season = randomUUID(),
    tour = randomUUID(),
    clubs: string[] = [],
    templateName = `Groups and brackets ${token}`;
  const admin = createClient<Database>(backend!, secret!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    operator = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  let user: string | undefined;
  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Configuration fixture" },
    });
    expect(created.error).toBeNull();
    user = created.data.user!.id;
    expect(
      (
        await admin
          .from("staff_accounts")
          .insert({ id: user, email, display_name: "Configuration fixture" })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin
          .from("staff_roles")
          .insert({ user_id: user, role: "organizer" })
      ).error,
    ).toBeNull();
    expect(
      (await operator.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    expect(
      (
        await operator.rpc("save_season", {
          season_id: season,
          season_name: `Configuration ${token}`,
          season_year: 2026,
          first_day: "2026-01-01",
          last_day: "2026-12-31",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await operator.rpc("save_tour", {
          tour_id: tour,
          parent_season: season,
          tour_name: `Opening ${token}`,
          tour_ordinal: 1,
          first_day: "2026-03-01",
          last_day: "2026-03-03",
        })
      ).error,
    ).toBeNull();
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page.goto("/en/organizer/seasons");
    let card = page
      .getByRole("heading", { name: `Configuration ${token}`, exact: true })
      .locator("..");
    await expect(
      card.getByRole("button", { name: "Start season", exact: true }),
    ).toHaveCount(0);
    await card
      .getByRole("link", { name: "Configure tournament", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/en/organizer/tournaments/${tour}$`),
    );
    const settings = page.getByRole("form", {
      name: "Save tournament settings",
      exact: true,
    });
    await expect(settings.getByLabel("Number of tables")).toHaveValue("12");
    await expect(settings.getByLabel("Minimum rest (minutes)")).toHaveValue(
      "60",
    );
    await expect(settings.getByLabel("Venue timezone")).toHaveValue(
      "Asia/Almaty",
    );
    await settings.getByLabel("Elo K-factor").fill("32");
    await settings
      .getByRole("button", { name: "Save tournament settings", exact: true })
      .click();
    await expect(
      settings.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    const template = page.getByRole("form", {
      name: "Create stage template",
      exact: true,
    });
    await template.getByLabel("Name", { exact: true }).fill(templateName);
    await template
      .getByRole("button", { name: "Create stage template", exact: true })
      .click();
    await expect(
      template.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    const saved = await admin
      .from("stage_templates")
      .select("id")
      .eq("name", templateName)
      .single();
    expect(saved.error).toBeNull();
    const apply = page.getByRole("form", {
      name: "Apply template",
      exact: true,
    });
    await apply
      .getByRole("combobox", { name: "Stage template", exact: true })
      .selectOption(saved.data!.id);
    await apply
      .getByRole("button", { name: "Apply template", exact: true })
      .click();
    await expect(
      apply.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    for (const age of ["U13", "U15", "U17"]) {
      const plan = page.getByRole("region", {
        name: `Stage plans ${age}`,
        exact: true,
      });
      await expect(
        plan.getByText("1. Round-robin groups: 4 × 6", { exact: true }),
      ).toBeVisible();
      await expect(
        plan.getByText("2. Knockout bracket: 8 Entries · Group places 1–2", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        plan.getByText("4. Knockout bracket: 8 Entries · Group places 5–6", {
          exact: true,
        }),
      ).toBeVisible();
    }
    await page.goto("/en/organizer/seasons");
    card = page
      .getByRole("heading", { name: `Configuration ${token}`, exact: true })
      .locator("..");
    await expect(
      card.getByText(
        "Registered clubs must match every stage plan’s entry count.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      (await operator.rpc("start_season", { season_id: season })).error?.code,
    ).toBe("22023");
    for (let i = 0; i < 24; i++) {
      const id = randomUUID();
      clubs.push(id);
      expect(
        (
          await operator.rpc("save_team", {
            team_id: id,
            team_name: `Config ${token} ${i}`,
            team_region: "Synthetic",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await operator.rpc("register_season_team", {
            parent_season: season,
            club: id,
          })
        ).error,
      ).toBeNull();
    }
    await page.reload();
    await expect(
      card.getByText("Ready to start", { exact: true }),
    ).toBeVisible();
    await card.getByRole("checkbox").check();
    await card
      .getByRole("button", { name: "Start season", exact: true })
      .click();
    await expect(
      card.getByText("Season configuration is locked.", { exact: true }),
    ).toBeVisible();
    await expect(card.getByRole("form")).toHaveCount(0);
    await card
      .getByRole("link", { name: "Configure tournament", exact: true })
      .click();
    const change = page.getByRole("form", {
      name: "Change K for future results",
      exact: true,
    });
    await expect(
      page.getByRole("form", { name: "Apply template", exact: true }),
    ).toHaveCount(0);
    await expect(change.getByLabel("Number of tables")).toHaveCount(0);
    await change.getByLabel("Elo K-factor").fill("64");
    await change
      .getByRole("button", { name: "Change K for future results", exact: true })
      .click();
    await expect(
      change.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    const versions = await admin
      .from("tournament_settings")
      .select("id,k_factor,revision")
      .eq("tour_id", tour)
      .order("revision");
    expect(versions.data?.map((v) => v.k_factor)).toEqual([32, 64]);
    const snapshot = await admin
      .from("season_configuration_snapshots")
      .select("configuration")
      .eq("season_id", season)
      .single();
    expect(JSON.stringify(snapshot.data)).toContain(versions.data![0].id);
    expect(JSON.stringify(snapshot.data)).not.toContain(versions.data![1].id);
    await page.getByText("Settings history", { exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("tournament-configuration.png"),
      fullPage: true,
    });
  } finally {
    test.setTimeout(120000);
    await operator.auth.signOut();
    await admin
      .from("season_configuration_snapshots")
      .delete()
      .eq("season_id", season);
    const plans = await admin
      .from("tour_stage_plans")
      .select("id")
      .eq("tour_id", tour);
    if (plans.data?.length)
      await admin
        .from("stages")
        .delete()
        .in(
          "plan_id",
          plans.data.map((v) => v.id),
        );
    await admin.from("tour_stage_plans").delete().eq("tour_id", tour);
    const templates = await admin
      .from("stage_templates")
      .select("id")
      .eq("name", templateName);
    await admin.from("stage_templates").delete().eq("name", templateName);
    await admin.from("tournament_settings").delete().eq("tour_id", tour);
    await admin.from("tours").delete().eq("id", tour);
    await admin.from("season_team_entries").delete().eq("season_id", season);
    await admin.from("seasons").delete().eq("id", season);
    if (clubs.length) {
      await admin.from("subteams").delete().in("team_id", clubs);
      await admin.from("teams").delete().in("id", clubs);
    }
    await admin
      .from("audit_logs")
      .delete()
      .in("entity_id", [
        season,
        tour,
        ...clubs,
        ...(templates.data ?? []).map((v) => v.id),
      ]);
    if (user) {
      await admin.from("staff_roles").delete().eq("user_id", user);
      await admin.from("staff_accounts").delete().eq("id", user);
      await admin.auth.admin.deleteUser(user);
    }
  }
});
