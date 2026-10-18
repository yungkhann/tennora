import { test, expect } from "@playwright/test";
import { drawFixture } from "./helpers/draw-fixture";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL;
test.skip(
  !backend ||
    new URL(backend).hostname !== "127.0.0.1" ||
    !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  "Local disposable fixtures required.",
);
test("Main Judge generates and publishes an eight-team seeded classification knockout", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const f = await drawFixture({ knockoutSize: 8 });
  try {
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[1]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page.goto(`/en/draws/${f.tour}/U13`);
    const generate = page.getByRole("form", {
      name: "Generate draw",
      exact: true,
    });
    await generate.getByRole("checkbox").check();
    await generate
      .getByRole("button", { name: "Generate draw", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Frozen seeds · Knockout bracket",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Match graph · Knockout bracket",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Version 1 · Draft · Matches: 12" }),
    ).toBeVisible();
    expect(
      await page
        .getByText("Frozen team rating: 5,000", { exact: true })
        .count(),
    ).toBe(8);
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
        .filter({ hasText: "Version 1 · Published · Matches: 12" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Match lineups", exact: true }),
    ).toHaveCount(4);
    await expect(
      page.getByRole("region", { name: "Group standings", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page
      .getByRole("heading", {
        name: "Match graph · Knockout bracket",
        exact: true,
      })
      .locator("..")
      .screenshot({ path: testInfo.outputPath("knockout-graph.png") });
    await page
      .getByRole("link", { name: "Match lineups", exact: true })
      .first()
      .click();
    await expect(
      page.getByText(
        "Player selections stay hidden until both teams submit. Officials see submission status only.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Upstream results are not finalized. Lineups are unavailable until qualifier sources are ready.",
        { exact: true },
      ),
    ).toHaveCount(0);
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/en/tournament/${f.tour}`);
    await publicPage
      .getByRole("link", { name: "Draws · U13", exact: true })
      .click();
    const bracket = publicPage.getByRole("region", {
      name: "Draws",
      exact: true,
    });
    await expect(bracket).toBeVisible();
    expect(await bracket.locator(".bracket-round").count()).toBeGreaterThan(1);
    for (const width of [375, 430, 768, 1024, 1440]) {
      await publicPage.setViewportSize({ width, height: 1000 });
      expect(
        await publicPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await publicPage.screenshot({
      path: `/tmp/tennora-bracket-${testInfo.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await publicPage.setViewportSize({ width: 375, height: 1000 });
    expect(
      await bracket.evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
    await bracket.focus();
    await publicPage.keyboard.press("ArrowRight");
    await expect
      .poll(() => bracket.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    await publicPage.close();
  } finally {
    await f.cleanup();
  }
});
