import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { test, expect, type Page } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL,
  secret = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
test.skip(
  !backend || new URL(backend).hostname !== "127.0.0.1" || !secret,
  "Local disposable backend required.",
);
test.use({ actionTimeout: 15000 });
async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
}
test("private photo and evidence require Organizer review; public JPEG strips metadata and revocation removes access", async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.setTimeout(90000);
  const token = randomUUID().slice(0, 8),
    password = `Photo!${randomUUID()}`,
    club = randomUUID(),
    player = randomUUID(),
    emails = [
      `photo-org-${token}@example.test`,
      `photo-uploader-${token}@example.test`,
      `photo-coach-${token}@example.test`,
    ],
    users: string[] = [];
  const admin = createClient<Database>(backend!, secret!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    operator = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  const uploaderContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
      viewport: page.viewportSize() ?? { width: 1280, height: 720 },
    }),
    otherContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
  try {
    for (let i = 0; i < 3; i++) {
      const result = await admin.auth.admin.createUser({
        email: emails[i],
        password,
        email_confirm: true,
        user_metadata: { display_name: `Photo Fixture ${i}` },
      });
      expect(result.error).toBeNull();
      const id = result.data.user!.id;
      users.push(id);
      expect(
        (
          await admin.from("staff_accounts").insert({
            id,
            email: emails[i],
            display_name: `Photo Fixture ${i}`,
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
    expect(
      (
        await operator.rpc("save_team", {
          team_id: club,
          team_name: `Photo Club ${token}`,
          team_region: "Synthetic",
        })
      ).error,
    ).toBeNull();
    const subs = await admin.from("subteams").select("id").eq("team_id", club);
    for (const trainer of users.slice(1))
      expect(
        (
          await operator.rpc("assign_team_trainer", {
            trainer,
            club,
            coached_subteams: subs.data!.map((s) => s.id),
          })
        ).error,
      ).toBeNull();
    expect(
      (
        await operator.rpc("save_player", {
          player_id: player,
          club,
          first_name: "Photo",
          last_name: `Player ${token}`,
          gender: "boy",
          dob: "2014-01-01",
          hand: "right",
          style: "attack",
          sports_level: "junior",
        })
      ).error,
    ).toBeNull();
    const portrait = await sharp({
        create: { width: 900, height: 600, channels: 3, background: "#245e48" },
      })
        .jpeg()
        .withExif({ IFD0: { Artist: "Private consent metadata" } })
        .toBuffer(),
      evidence = Buffer.from(
        "%PDF-1.4\nSynthetic written guardian permission for a test fixture.\n%%EOF",
      );
    const original = Buffer.concat([
      portrait,
      Buffer.alloc(2 * 1024 * 1024 - portrait.byteLength),
    ]);
    const largeEvidence = Buffer.concat([
      evidence,
      Buffer.alloc(2 * 1024 * 1024 - evidence.byteLength, 32),
    ]);
    const uploader = await uploaderContext.newPage();
    await login(uploader, emails[1], password);
    await uploader.goto(`/en/team/${club}`);
    await uploader
      .locator("summary")
      .filter({ hasText: "Photos and consent" })
      .click();
    const form = uploader.getByRole("form", {
      name: "Upload photo for review",
      exact: true,
    });
    await form.locator('input[name="photo"]').setInputFiles({
      name: "portrait.jpg",
      mimeType: "image/jpeg",
      buffer: original,
    });
    await form.locator('input[name="evidence"]').setInputFiles({
      name: "consent.pdf",
      mimeType: "application/pdf",
      buffer: largeEvidence,
    });
    await form.locator('input[name="permission"]').check();
    await form
      .getByRole("button", { name: "Upload photo for review", exact: true })
      .click();
    await expect(
      form.getByText("Uploaded privately. Awaiting Organizer review.", {
        exact: true,
      }),
    ).toBeVisible();
    const record = await admin
      .from("player_photo_assets")
      .select("id,state,photo_path,evidence_path")
      .eq("player_id", player)
      .single();
    expect(record.error).toBeNull();
    const asset = record.data!;
    expect(asset.state).toBe("pending_review");
    const publicPath = `/api/public/player-photo/${player}`,
      privatePath = `/api/staff/photos/${asset.id}?kind=evidence`;
    expect((await request.get(publicPath)).status()).toBe(404);
    expect((await request.get(privatePath)).status()).toBe(401);
    const ownProof = await uploaderContext.request.get(privatePath);
    expect(ownProof.status()).toBe(200);
    expect(ownProof.headers()["content-disposition"]).toContain("attachment");
    expect(await ownProof.body()).toEqual(largeEvidence);
    const other = await otherContext.newPage();
    await login(other, emails[2], password);
    expect((await otherContext.request.get(privatePath)).status()).toBe(404);
    const anon = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (await anon.storage.from("player-private").download(asset.photo_path))
        .error,
    ).not.toBeNull();
    expect(
      (await anon.storage.from("player-private").download(asset.evidence_path))
        .error,
    ).not.toBeNull();
    await login(page, emails[0], password);
    await page.goto(`/en/team/${club}`);
    await page
      .locator("summary")
      .filter({ hasText: "Photos and consent" })
      .click();
    const review = page.getByRole("form", {
      name: "Save publication decision",
      exact: true,
    });
    await review
      .getByRole("combobox", { name: "Publication decision", exact: true })
      .selectOption("approve");
    await review
      .getByLabel("Reason", { exact: true })
      .fill("Written guardian consent reviewed");
    await review
      .getByRole("button", { name: "Save publication decision", exact: true })
      .click();
    await expect(
      page.getByText("Publication approved", { exact: true }),
    ).toBeVisible();
    expect(
      (await anon.storage.from("player-private").download(asset.photo_path))
        .error,
    ).not.toBeNull();
    const published = await request.get(publicPath);
    expect(published.status()).toBe(200);
    expect(published.headers()["content-type"]).toBe("image/jpeg");
    expect(published.headers()["cache-control"]).toContain("no-store");
    const meta = await sharp(await published.body()).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBeLessThanOrEqual(512);
    expect(meta.exif).toBeUndefined();
    expect((await request.get(privatePath)).status()).toBe(401);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("photo-review.png"),
      fullPage: true,
    });
    await review
      .getByRole("combobox", { name: "Publication decision", exact: true })
      .selectOption("revoke");
    await review
      .getByLabel("Reason", { exact: true })
      .fill("Guardian withdrew consent");
    await review
      .getByRole("button", { name: "Save publication decision", exact: true })
      .click();
    await expect(
      page.getByText("Publication revoked", { exact: true }),
    ).toBeVisible();
    expect((await request.get(publicPath)).status()).toBe(404);
    expect((await page.context().request.get(privatePath)).status()).toBe(200);
    const audit = await admin
      .from("audit_logs")
      .select("action")
      .eq("entity_id", asset.id);
    expect(audit.data?.map((a) => a.action)).toEqual(
      expect.arrayContaining([
        "photo.upload_started",
        "photo.upload_completed",
        "photo.approve",
        "photo.revoke",
      ]),
    );
  } finally {
    testInfo.setTimeout(testInfo.timeout + 30000);
    await uploaderContext.close().catch(() => {});
    await otherContext.close().catch(() => {});
    const assets = await admin
      .from("player_photo_assets")
      .select("photo_path,evidence_path")
      .eq("player_id", player);
    const paths = (assets.data ?? []).flatMap((a) => [
      a.photo_path,
      a.evidence_path,
    ]);
    if (paths.length)
      expect(
        (await admin.storage.from("player-private").remove(paths)).error,
      ).toBeNull();
    await admin.from("public_player_photos").delete().eq("player_id", player);
    await admin.from("player_photo_assets").delete().eq("player_id", player);
    await admin.from("rating_history").delete().eq("player_id", player);
    await admin.from("players").delete().eq("id", player);
    await admin.from("subteam_trainers").delete().in("trainer_id", users);
    await admin.from("trainer_profiles").delete().in("user_id", users);
    await admin.from("subteams").delete().eq("team_id", club);
    await admin.from("teams").delete().eq("id", club);
    await admin.from("audit_logs").delete().in("actor_id", users);
    await admin.from("staff_roles").delete().in("user_id", users);
    await admin.from("staff_accounts").delete().in("id", users);
    for (const id of users)
      expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});
