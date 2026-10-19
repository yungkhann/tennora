import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { drawFixture } from "./helpers/draw-fixture";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL;
test.skip(
  !backend ||
    new URL(backend).hostname !== "127.0.0.1" ||
    !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  "Requires local disposable Supabase fixtures.",
);
test("independent boys/girls positions, age, search and pagination use real public players", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const f = await drawFixture();
  const check = (result: { error: unknown }) => expect(result.error).toBeNull();
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
      await f.operator.rpc("publish_tour_draw", {
        draw,
        expected_revision: 1,
      }),
    );
    const publicRows = await f.admin
      .from("public_league_players")
      .select("id,gender,first_name,last_name,rating,team_name,age_group")
      .in("id", f.players)
      .order("rating", { ascending: false })
      .order("last_name")
      .order("id");
    check(publicRows);
    expect(publicRows.data).toHaveLength(120);
    for (const gender of ["boy", "girl"] as const) {
      const expected = publicRows.data!.filter((p) => p.gender === gender);
      await page.goto(
        `/ru/ranking?gender=${gender}&age=U13&q=${encodeURIComponent(f.token)}`,
      );
      await expect(
        page.getByRole("link", {
          name: gender === "boy" ? "Мальчики" : "Девочки",
          exact: true,
        }),
      ).toHaveAttribute("aria-current", "page");
      const rows = page.locator("tbody tr:visible");
      await expect(rows).toHaveCount(Math.min(50, expected.length));
      for (const index of [0, Math.min(49, expected.length - 1)]) {
        await expect(rows.nth(index).locator("td").first()).toHaveText(
          String(index + 1).padStart(2, "0"),
        );
        await expect(rows.nth(index).locator("a")).toHaveAttribute(
          "href",
          `/ru/player/${expected[index].id}`,
        );
      }
      if (expected.length > 50) {
        await page.getByRole("link", { name: "Далее", exact: true }).click();
        await expect(page).toHaveURL(/gender=boy&page=2/);
        await expect(rows).toHaveCount(expected.length - 50);
        await expect(rows.first().locator("td").first()).toHaveText("51");
        await expect(rows.first().locator("a")).toHaveAttribute(
          "href",
          `/ru/player/${expected[50].id}`,
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    // Switching gender retains search and age while resetting pagination.
    await page.getByRole("link", { name: "Мальчики", exact: true }).click();
    await expect(page.getByRole("textbox")).toHaveValue(f.token);
    await expect(page.getByRole("combobox")).toHaveValue("U13");
    await expect(
      page.locator("tbody tr:visible").first().locator("td").first(),
    ).toHaveText("01");
    await page.getByRole("combobox").selectOption("U15");
    await page
      .getByRole("button", { name: "Применить фильтры", exact: true })
      .click();
    await expect(page.locator("tbody tr:visible")).toHaveCount(0);
    await page.getByRole("link", { name: "Девочки", exact: true }).click();
    await expect(page.getByRole("combobox")).toHaveValue("U15");
    await expect(page.locator("tbody tr:visible")).toHaveCount(0);
    await page.getByRole("combobox").selectOption("U13");
    await page
      .getByRole("button", { name: "Применить фильтры", exact: true })
      .click();
    await expect(page.locator("tbody tr:visible")).toHaveCount(48);
    await page.screenshot({
      path: testInfo.outputPath("gender-ranking.png"),
      fullPage: false,
    });
  } finally {
    await f.cleanup();
  }
});
