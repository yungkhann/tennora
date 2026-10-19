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
test("hall allocates, takes over, calls and bulk-starts ready matches", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const f = await drawFixture({
    knockoutSize: 2,
    currentDay: true,
    tables: 4,
  });
  const trainer = createClient<Database>(
    backend!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const check = (r: { error: unknown }) => expect(r.error).toBeNull();
  try {
    check(
      await f.admin.from("staff_roles").insert([
        { user_id: f.users[1], role: "line_judge" },
        { user_id: f.users[0], role: "trainer" },
      ]),
    );
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
    const found = await f.admin
      .from("team_matches")
      .select("id,subteam_a,subteam_b")
      .eq("draw_id", draw)
      .single();
    check(found);
    const m = found.data!;
    const subs = await f.admin
      .from("subteams")
      .select("id,team_id")
      .in("id", [m.subteam_a!, m.subteam_b!]);
    check(subs);
    const people = await f.admin
      .from("players")
      .select("id,team_id,gender")
      .in(
        "team_id",
        subs.data!.map((v) => v.team_id),
      );
    check(people);
    const ordered = (sub: string) => {
      const club = subs.data!.find((v) => v.id === sub)!.team_id,
        b = people.data!.filter(
          (v) => v.team_id === club && v.gender === "boy",
        ),
        g = people.data!.filter(
          (v) => v.team_id === club && v.gender === "girl",
        );
      return [b[0].id, g[0].id, b[1].id, g[1].id, b[2].id];
    };
    for (const [sub, actor] of [
      [m.subteam_a!, f.users[2]],
      [m.subteam_b!, f.users[0]],
    ])
      check(
        await f.operator.rpc("assign_team_trainer", {
          trainer: actor,
          club: subs.data!.find((v) => v.id === sub)!.team_id,
          coached_subteams: [sub],
        }),
      );
    check(
      await trainer.auth.signInWithPassword({
        email: f.emails[2],
        password: f.password,
      }),
    );
    check(
      await trainer.rpc("submit_lineup", {
        lineup_id: randomUUID(),
        match: m.id,
        subteam: m.subteam_a!,
        players: ordered(m.subteam_a!),
      }),
    );
    check(
      await f.operator.rpc("submit_lineup", {
        lineup_id: randomUUID(),
        match: m.id,
        subteam: m.subteam_b!,
        players: ordered(m.subteam_b!),
      }),
    );
    await page.goto("/en/login");
    await page.getByLabel("Email address").fill(f.emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await page.goto(`/en/hall?tour=${f.tour}`);
    await expect(
      page.getByRole("heading", { name: "Hall control", exact: true }),
    ).toBeVisible();
    const allocate = page.getByRole("form", {
      name: "Allocate ready matches",
      exact: true,
    });
    await allocate.getByLabel("I confirm this action", { exact: true }).check();
    await allocate
      .getByLabel("I confirm this action", {
        exact: true,
      })
      .check();
    await allocate
      .getByRole("button", { name: "Allocate ready matches", exact: true })
      .click();
    await expect(allocate.getByRole("status")).toBeVisible();
    await page
      .getByRole("button", { name: "Refresh hall", exact: true })
      .click();
    const lease = await f.admin
      .from("match_table_leases")
      .select("table_number")
      .eq("match_id", m.id)
      .single();
    check(lease);
    const card = page
      .getByRole("heading", {
        name: `Table ${lease.data!.table_number}`,
        exact: true,
      })
      .locator("..")
      .locator("..");
    await card.locator("summary").click();
    await card.locator('select[name="operation"]').selectOption("takeover");
    await card.getByLabel("I confirm this action", { exact: true }).check();
    await card
      .getByRole("button", { name: "Assign judge", exact: true })
      .click();
    await expect(card.getByRole("status")).toBeVisible();
    await page.goto(`/en/matches/${m.id}/manage`);
    const call = page.getByRole("form", { name: "Call teams", exact: true });
    await call.getByLabel("I confirm this action", { exact: true }).check();
    await call.getByRole("button", { name: "Call teams", exact: true }).click();
    await expect(call.getByRole("status")).toBeVisible();
    await page.goto(`/en/hall?tour=${f.tour}`);
    const start = page.getByRole("form", {
      name: "Start all assigned",
      exact: true,
    });
    await start.getByLabel("I confirm this action", { exact: true }).check();
    await start
      .getByLabel("I confirm this action", {
        exact: true,
      })
      .check();
    await start
      .getByRole("button", { name: "Start all assigned", exact: true })
      .click();
    await expect(start.getByRole("status")).toBeVisible();
    const saved = await f.admin
      .from("team_matches")
      .select("status")
      .eq("id", m.id)
      .single();
    check(saved);
    expect(saved.data?.status).toBe("in_progress");
    await page
      .getByRole("button", { name: "Refresh hall", exact: true })
      .click();
    await expect(
      page.getByText("In progress", { exact: true }).first(),
    ).toBeVisible();
    const snapshot = await page.request.get(`/api/staff/hall/${f.tour}`);
    expect(snapshot.status()).toBe(200);
    expect(snapshot.headers()["cache-control"]).toContain("no-store");
    const body = await snapshot.json();
    expect(JSON.stringify(body)).not.toContain("date_of_birth");
    expect(body.matches).toHaveLength(1);
    await page.screenshot({
      path: testInfo.outputPath("hall.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(pageErrors).toEqual([]);
  } finally {
    await trainer.auth.signOut();
    await f.cleanup();
  }
});
