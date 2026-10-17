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
test("Organizer reviews provisional standings and resolves an audited circular tie", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  const f = await drawFixture();
  const judge = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
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
      await f.operator.rpc("publish_tour_draw", { draw, expected_revision: 1 }),
    );
    const groups = await f.admin
      .from("stage_groups")
      .select("id")
      .eq("draw_id", draw)
      .eq("label", "A")
      .single();
    check(groups);
    const group = groups.data!.id;
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    const url = `/en/draws/${f.tour}/U13?group=${group}`;
    await page.goto(url);
    const section = page.getByRole("region", {
      name: "Group standings",
      exact: true,
    });
    await expect(
      section.getByText(
        "Standings have not been calculated yet. Refresh to show the current results.",
      ),
    ).toBeVisible();
    await section
      .getByRole("button", { name: "Refresh standings", exact: true })
      .click();
    await expect(
      section.getByText(
        "Provisional: group matches are still incomplete. No qualifiers advance.",
      ),
    ).toBeVisible();
    await expect(section.getByRole("article")).toHaveCount(6);
    await section.screenshot({
      path: testInfo.outputPath("standings-provisional.png"),
    });
    const entries = await f.admin
      .from("draw_entries")
      .select("subteam_id,group_slot")
      .eq("group_id", group);
    check(entries);
    const slots = new Map(
      entries.data!.map((v) => [v.subteam_id, v.group_slot!]),
    );
    const matches = await f.admin
      .from("team_matches")
      .select("id,subteam_a,subteam_b")
      .eq("group_id", group);
    check(matches);
    for (const m of matches.data!) {
      const a = slots.get(m.subteam_a!)!,
        b = slots.get(m.subteam_b!)!;
      const aWins =
        Math.min(a, b) === 1 && Math.max(a, b) === 3 ? a === 3 : a < b;
      const result = randomUUID();
      check(
        await f.admin.from("team_match_results").insert({
          id: result,
          match_id: m.id,
          revision: 1,
          winner: aWins ? m.subteam_a! : m.subteam_b!,
          kind: "played",
          games_a: aWins ? 3 : 0,
          games_b: aWins ? 0 : 3,
          sets_a: aWins ? 9 : 0,
          sets_b: aWins ? 0 : 9,
          points_a: aWins ? 99 : 0,
          points_b: aWins ? 0 : 99,
          created_by: f.users[0],
        }),
      );
      check(
        await f.admin
          .from("team_matches")
          .update({ result_id: result, result_revision: 1, status: "finished" })
          .eq("id", m.id),
      );
    }
    await section
      .getByRole("button", { name: "Refresh standings", exact: true })
      .click();
    await expect(
      section.getByText(
        "Group complete. An Organizer draw is required to resolve the remaining tie.",
      ),
    ).toBeVisible();
    const jp = await judge.newPage();
    await jp.goto("/en/login");
    await jp.getByLabel("Email address").fill(f.emails[1]);
    await jp.getByLabel("Password", { exact: true }).fill(f.password);
    await jp.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(jp).toHaveURL(/\/en\/workspace$/);
    await jp.goto(url);
    await expect(
      jp.getByRole("button", { name: "Draw unresolved ties", exact: true }),
    ).toHaveCount(0);
    const form = section.getByRole("form", {
      name: "Draw unresolved ties",
      exact: true,
    });
    await form.getByRole("checkbox").check();
    await form
      .getByRole("button", { name: "Draw unresolved ties", exact: true })
      .click();
    await expect(
      section.getByText(
        "Group finalized. Qualifiers advance from this snapshot.",
      ),
    ).toBeVisible();
    await expect(
      section.getByRole("button", {
        name: "Draw unresolved ties",
        exact: true,
      }),
    ).toHaveCount(0);
    await section.getByText("Tie-break evidence", { exact: true }).click();
    await expect(section.getByText(/^Audited random draw:/)).toBeVisible();
    const receipts = await f.admin
      .from("group_tie_draws")
      .select("id,lots")
      .eq("group_id", group);
    check(receipts);
    expect(receipts.data).toHaveLength(1);
    const head = await f.admin
      .from("group_standing_heads")
      .select("snapshot_id")
      .eq("group_id", group)
      .single();
    check(head);
    check(
      await f.operator.rpc("draw_group_ties", {
        group_id: group,
        expected_revision: 2,
      }),
    );
    const again = await f.admin
      .from("group_standing_heads")
      .select("snapshot_id")
      .eq("group_id", group)
      .single();
    check(again);
    expect(again.data).toEqual(head.data);
    await section.screenshot({
      path: testInfo.outputPath("standings-final.png"),
    });
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
