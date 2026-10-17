import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL,
  secret = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
test.skip(
  !backend || new URL(backend).hostname !== "127.0.0.1" || !secret,
  "Requires disposable local Supabase fixtures.",
);
test("Organizer configures a season and tour; Main Judge cannot configure; started season is locked", async ({
  page,
  browser,
}, testInfo) => {
  const admin = createClient<Database>(backend!, secret!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = randomUUID().slice(0, 8),
    password = `Season!${randomUUID()}`,
    name = `Season ${token}`,
    email = `season-${token}@example.test`;
  const ids: string[] = [];
  let seasonId: string | undefined;
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  try {
    for (const [address, role] of [
      [email, "organizer"],
      [`judge-${token}@example.test`, "main_judge"],
    ] as const) {
      const result = await admin.auth.admin.createUser({
        email: address,
        password,
        email_confirm: true,
        user_metadata: { display_name: "Season Tester" },
      });
      expect(result.error).toBeNull();
      const id = result.data.user!.id;
      ids.push(id);
      expect(
        (
          await admin
            .from("staff_accounts")
            .insert({ id, email: address, display_name: "Season Tester" })
        ).error,
      ).toBeNull();
      expect(
        (await admin.from("staff_roles").insert({ user_id: id, role })).error,
      ).toBeNull();
    }
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page.getByRole("link", { name: "Seasons", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/organizer\/seasons$/);
    const create = page.getByRole("form", {
      name: "Create season",
      exact: true,
    });
    await create.getByLabel("Name", { exact: true }).fill(name);
    await create.getByLabel("Season year for age eligibility").fill("2026");
    await create.getByLabel("Start date").fill("2026-01-01");
    await create.getByLabel("End date").fill("2026-12-31");
    await create
      .getByRole("button", { name: "Create season", exact: true })
      .click();
    await expect(
      create.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await expect(
      create.getByRole("button", { name: "Create season", exact: true }),
    ).toBeDisabled();
    const result = await admin
      .from("seasons")
      .select("id")
      .eq("name", name)
      .single();
    expect(result.error).toBeNull();
    seasonId = result.data!.id;
    const card = page.getByRole("heading", { name, exact: true }).locator("..");
    await card.locator("summary").filter({ hasText: "Add tournament" }).click();
    const tour = card.getByRole("form", {
      name: "Add tournament",
      exact: true,
    });
    await tour.getByLabel("Name", { exact: true }).fill("Opening Tour");
    await tour.getByLabel("Order", { exact: true }).fill("1");
    await tour.getByLabel("Start date").fill("2026-03-01");
    await tour.getByLabel("End date").fill("2026-03-03");
    await tour
      .getByRole("button", { name: "Add tournament", exact: true })
      .click();
    await expect(
      tour.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await expect(
      tour.getByRole("button", { name: "Add tournament", exact: true }),
    ).toBeDisabled();
    await expect(
      card.getByRole("heading", { name: "1. Opening Tour", exact: true }),
    ).toBeVisible();
    await card.locator("summary").filter({ hasText: "Edit season" }).click();
    const edit = card.getByRole("form", {
      name: `Edit season ${name}`,
      exact: true,
    });
    await edit.getByLabel("Name", { exact: true }).fill(`${name} Updated`);
    await edit
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `${name} Updated`, exact: true }),
    ).toBeVisible();
    const audit = await admin
      .from("audit_logs")
      .select("action,actor_id")
      .eq("entity_id", seasonId)
      .order("created_at");
    expect(audit.data?.map((a) => a.action)).toEqual([
      "season.created",
      "season.updated",
    ]);
    expect(audit.data?.every((a) => a.actor_id === ids[0])).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("seasons.png"),
      fullPage: true,
    });
    const judge = await context.newPage();
    await judge.goto("/en/login");
    await judge.getByLabel("Email address").fill(`judge-${token}@example.test`);
    await judge.getByLabel("Password", { exact: true }).fill(password);
    await judge.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(judge).toHaveURL(/\/en\/workspace$/);
    await expect(
      judge.getByRole("link", { name: "Seasons", exact: true }),
    ).toHaveCount(0);
    await judge.goto("/en/organizer/seasons");
    await expect(
      judge.getByRole("heading", { name: /This page isn.t available/ }),
    ).toBeVisible();
    expect(await judge.content()).not.toContain(name);
    expect(
      (
        await admin
          .from("seasons")
          .update({ status: "started", started_at: new Date().toISOString() })
          .eq("id", seasonId)
      ).error,
    ).toBeNull();
    await page.reload();
    const locked = page
      .getByRole("heading", { name: `${name} Updated`, exact: true })
      .locator("..");
    await expect(
      locked.getByText("Season configuration is locked.", { exact: true }),
    ).toBeVisible();
    await expect(locked.getByRole("form")).toHaveCount(0);
  } finally {
    await context.close();
    if (seasonId) {
      const tours = await admin
        .from("tours")
        .select("id")
        .eq("season_id", seasonId);
      await admin
        .from("audit_logs")
        .delete()
        .in("entity_id", [seasonId, ...(tours.data ?? []).map((t) => t.id)]);
      await admin.from("tours").delete().eq("season_id", seasonId);
      await admin.from("seasons").delete().eq("id", seasonId);
    }
    await admin.from("staff_roles").delete().in("user_id", ids);
    await admin.from("staff_accounts").delete().in("id", ids);
    for (const id of ids)
      expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});
