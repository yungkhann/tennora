import { test, expect } from "@playwright/test";
import type { PublicRow } from "../../src/features/public/validation";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Presentation fixtures stay inside this browser test. Production uses real projections.
const rows: PublicRow[] = ["in_progress", "scheduled", "finished"].map(
  (status, i) => ({
    match_id: id(i + 1),
    tour_id: id(100),
    version: 1,
    updated_at: "2026-10-18T12:00:00Z",
    data: {
      id: id(i + 1),
      tour_id: id(100),
      season_id: id(101),
      draw_id: id(102),
      group_id: id(103),
      age_group: "U13",
      round: i + 1,
      number: i + 1,
      placement_from: null,
      placement_to: null,
      status: status as PublicRow["data"]["status"],
      a: { id: id(200), name: "Almaty Table Tennis Academy" },
      b: {
        id: id(201),
        name: i === 1 ? "Astana Juniors" : "Karaganda Regional Sports Club",
      },
      table: i === 0 ? 4 : null,
      started_at: null,
      completed_at: null,
      revealed: i === 0,
      singles:
        i === 0
          ? [
              {
                id: id(300),
                slot: 1,
                status: "in_progress",
                a: { id: id(301), name: "Alexandra Long Player Name" },
                b: { id: id(302), name: "Bakhytzhan Long Player Name" },
                sets: [
                  { a: 11, b: 8 },
                  { a: 8, b: 11 },
                  { a: 11, b: 9 },
                  { a: 9, b: 11 },
                  { a: 7, b: 5 },
                ],
                summary: {
                  points_a: 7,
                  points_b: 5,
                  sets_a: 2,
                  sets_b: 2,
                  server: "a",
                  ends_swapped: true,
                },
                winner: null,
                kind: null,
                timeout_until: null,
              },
            ]
          : [],
      result: null,
    },
  }),
);
test("live presentation filters, selection, search and responsive themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/public/matches?*", (route) =>
    route.fulfill({ json: rows }),
  );
  await page.goto("/en/live");
  await expect(
    page.getByRole("button", { name: "Live now 1", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("7 : 5", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Serving")).toBeVisible();
  await page.getByRole("button", { name: "Upcoming 1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Upcoming 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("7 : 5", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("article")).toContainText("Astana Juniors");
  await page.getByRole("button", { name: "All 3", exact: true }).click();
  await expect(page.locator(".match-list-item")).toHaveCount(3);
  await page.getByLabel("Search teams").fill("Astana");
  await expect(page.locator(".match-list-item")).toHaveCount(1);
  await page.getByLabel("Search teams").fill("No matching team");
  await expect(page.getByText("No matches in this view.")).toBeVisible();
  await page.getByLabel("Search teams").fill("");
  await page.getByRole("button", { name: "Live now 1", exact: true }).click();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      localStorage.setItem("theme", value);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(value);
    }, theme);
    for (const width of [375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.getByText("7 : 5", { exact: true })).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator('.public-navigation [aria-current="page"]')
            .evaluate((el) => {
              const item = el.getBoundingClientRect(),
                nav = el.closest("nav")!.getBoundingClientRect();
              return item.left >= nav.left - 1 && item.right <= nav.right + 1;
            }),
        )
        .toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (
        (theme === "light" && width === 1440) ||
        (theme === "dark" && width === 375)
      )
        await page.screenshot({
          path: `/tmp/tennora-live-${theme}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
  }
  await page.getByRole("button", { name: "Finished 1", exact: true }).click();
  await expect(page.locator(".match-list-item")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("Finished");
  expect(errors).toEqual([]);
});

test("localized home, mobile language menu and keyboard focus", async ({
  page,
}) => {
  for (const locale of ["ru", "kk", "en"]) {
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [375, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.locator("summary").click();
  await expect(
    page.locator("details nav").getByRole("link", { name: "RU", exact: true }),
  ).toBeVisible();
  await page
    .locator("details nav")
    .getByRole("link", { name: "RU", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ru$/);
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  const ring = await page
    .getByRole("link", { name: "Skip to content" })
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).not.toBe("none");
});
