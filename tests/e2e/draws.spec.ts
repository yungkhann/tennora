import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { drawFixture } from "./helpers/draw-fixture";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL;
test.skip(
  !backend ||
    new URL(backend).hostname !== "127.0.0.1" ||
    !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  "Local disposable fixtures required.",
);
test.use({ actionTimeout: 15000 });
test("Main Judge reviews frozen seeds and classification paths, appends a draft and publishes a locked draw", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const f = await drawFixture(),
    trainerContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
  try {
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[1]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Draws", exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/draws$/);
    const card = page
      .getByRole("heading", {
        name: `1. Draw Tournament ${f.token}`,
        exact: true,
      })
      .locator("..");
    await card.getByRole("link", { name: "U13", exact: true }).click();
    let generate = page.getByRole("form", {
      name: "Generate draw",
      exact: true,
    });
    await generate.getByRole("checkbox").check();
    await generate
      .getByRole("button", { name: "Generate draw", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Version 1 · Draft · Matches: 96" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Frozen seeds · Group A",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Match graph · Group A", exact: true }),
    ).toBeVisible();
    const plans = await f.admin
      .from("tour_stage_plans")
      .select("id")
      .eq("tour_id", f.tour)
      .eq("age_group", "U13")
      .single();
    expect(plans.error).toBeNull();
    const first = await f.admin
      .from("draw_revisions")
      .select("id")
      .eq("plan_id", plans.data!.id)
      .single();
    expect(first.error).toBeNull();
    const seed = await f.admin
      .from("draw_entries")
      .select("id,rating_total,subteam_id,draw_seed_players(player_id,rating)")
      .eq("draw_id", first.data!.id)
      .eq("seed", 1)
      .single();
    expect(seed.error).toBeNull();
    expect(
      (
        await f.admin
          .from("players")
          .update({ current_rating: 3000 })
          .eq("id", seed.data!.draw_seed_players[0].player_id)
      ).error,
    ).toBeNull();
    await page.reload();
    await expect(
      page.getByText("Frozen team rating: 5,000", { exact: true }),
    ).toHaveCount(6);
    generate = page.getByRole("form", {
      name: "Regenerate draft draw",
      exact: true,
    });
    await generate.getByRole("checkbox").check();
    await generate
      .getByRole("button", { name: "Regenerate draft draw", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Version 2 · Draft · Matches: 96" }),
    ).toBeVisible();
    await expect(
      page.getByText("Frozen team rating: 7,000", { exact: true }),
    ).toBeVisible();
    const history = await f.admin
      .from("draw_revisions")
      .select("id,revision")
      .eq("plan_id", plans.data!.id)
      .order("revision");
    expect(history.data).toHaveLength(2);
    expect(
      (
        await f.operator.rpc("publish_tour_draw", {
          draw: history.data![0].id,
          expected_revision: 1,
        })
      ).error?.code,
    ).toBe("22023");
    const publish = page.getByRole("form", {
      name: "Publish draw",
      exact: true,
    });
    await publish.getByRole("checkbox").check();
    await publish
      .getByRole("button", { name: "Publish draw", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Version 2 · Published · Matches: 96" }),
    ).toBeVisible();
    await expect(
      page.getByRole("form", { name: "Regenerate draft draw", exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await f.operator.rpc("generate_tour_draw", {
          draw_id: randomUUID(),
          tournament: f.tour,
          age: "U13",
          expected_revision: 2,
        })
      ).error?.message,
    ).toBe("Published draw is locked");
    await page
      .getByRole("link", { name: "Knockout bracket 1", exact: true })
      .click();
    await expect(
      page.getByText("Group A · Group places 1 / Group B · Group places 2", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Bracket places 7–8", { exact: true }),
    ).toBeVisible();
    const trainer = await trainerContext.newPage();
    await trainer.goto("/en/login");
    await trainer.getByLabel("Email address").fill(f.emails[2]);
    await trainer.getByLabel("Password", { exact: true }).fill(f.password);
    await trainer.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(trainer).toHaveURL(/\/en\/workspace$/);
    await expect(
      trainer.getByRole("link", { name: "Draws", exact: true }),
    ).toHaveCount(0);
    await trainer.goto(`/en/draws/${f.tour}/U13`);
    await expect(
      trainer.getByRole("heading", { name: /This page isn.t available/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("published-classification.png"),
      fullPage: true,
    });
    const published = await f.admin
      .from("draw_revisions")
      .select("id")
      .eq("plan_id", plans.data!.id)
      .not("published_at", "is", null)
      .single();
    expect(published.error).toBeNull();
    await page.goto(`/en/tournament/${f.tour}/draws/${published.data!.id}`);
    await expect(
      page.getByRole("heading", { name: "Group A", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Draws 1–8", exact: true }),
    ).toBeVisible();
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "EVERY MATCH.",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
    const ratingCell = await page
      .locator("tbody tr")
      .first()
      .locator("td")
      .last()
      .boundingBox();
    expect(ratingCell!.x + ratingCell!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await page.screenshot({
      path: testInfo.outputPath("public-home.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    test.setTimeout(120000);
    await trainerContext.close();
    await f.cleanup();
  }
});
