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
test("Organizer appends a frozen seed swap, then publishes a locked bracket", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const f = await drawFixture({ knockoutSize: 8 });
  const judge = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
  const check = (r: { error: unknown }) => expect(r.error).toBeNull();
  try {
    const source = randomUUID();
    check(
      await f.operator.rpc("generate_tour_draw", {
        draw_id: source,
        tournament: f.tour,
        age: "U13",
        expected_revision: 0,
      }),
    );
    const before = await f.admin
      .from("draw_entries")
      .select("seed,subteam_id,draw_seed_players(player_id,rating)")
      .eq("draw_id", source)
      .eq("seed", 1)
      .single();
    check(before);
    check(
      await f.admin
        .from("players")
        .update({ current_rating: 2500 })
        .eq("id", before.data!.draw_seed_players[0].player_id),
    );
    const url = `/en/draws/${f.tour}/U13`;
    const jp = await judge.newPage();
    await jp.goto("/en/login");
    await jp.getByLabel("Email address").fill(f.emails[1]);
    await jp.getByLabel("Password", { exact: true }).fill(f.password);
    await jp.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(jp).toHaveURL(/\/en\/workspace$/);
    await jp.goto(url);
    await expect(
      jp.getByRole("form", { name: "Swap seed positions", exact: true }),
    ).toHaveCount(0);
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page.goto(url);
    const form = page.getByRole("form", {
      name: "Swap seed positions",
      exact: true,
    });
    await form
      .getByRole("combobox", { name: "First seed position", exact: true })
      .selectOption("1");
    await form
      .getByRole("combobox", { name: "Second seed position", exact: true })
      .selectOption("2");
    await form
      .getByLabel("Reason", { exact: true })
      .fill("Reviewed competition seed order");
    await form.getByRole("checkbox").check();
    await form.screenshot({ path: testInfo.outputPath("seed-swap-form.png") });
    await form
      .getByRole("button", { name: "Swap seed positions", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Version 2 · Draft · Matches: 12" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Manual seed adjustment: Reviewed competition seed order",
        { exact: true },
      ),
    ).toBeVisible();
    const receipt = await f.admin
      .from("draw_seed_adjustments")
      .select("draw_id,source_draw_id,seed_a,seed_b,reason")
      .eq("source_draw_id", source)
      .single();
    check(receipt);
    expect(receipt.data!.seed_a).toBe(1);
    expect(receipt.data!.seed_b).toBe(2);
    const after = await f.admin
      .from("draw_entries")
      .select("subteam_id,rating_total,draw_seed_players(player_id,rating)")
      .eq("draw_id", receipt.data!.draw_id)
      .eq("seed", 2)
      .single();
    check(after);
    expect(after.data!.subteam_id).toBe(before.data!.subteam_id);
    expect(after.data!.rating_total).toBe(5000);
    expect(
      after.data!.draw_seed_players.sort((a, b) =>
        a.player_id.localeCompare(b.player_id),
      ),
    ).toEqual(
      before.data!.draw_seed_players.sort((a, b) =>
        a.player_id.localeCompare(b.player_id),
      ),
    );
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
        .filter({ hasText: "Version 2 · Published · Matches: 12" }),
    ).toBeVisible();
    await expect(
      page.getByRole("form", { name: "Swap seed positions", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Match lineups", exact: true }),
    ).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  } finally {
    await judge.close();
    await f.cleanup();
  }
});
