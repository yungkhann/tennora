import { randomUUID } from "node:crypto";
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL,
  adminKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const local = backend && new URL(backend).hostname === "127.0.0.1";
test.skip(
  !local || !adminKey,
  "Requires explicitly configured local Supabase test backend.",
);
async function emailLink(
  request: APIRequestContext,
  email: string,
  subject = "Reset",
) {
  let messageId = "";
  await expect
    .poll(
      async () => {
        const data = await (
          await request.get("http://127.0.0.1:54324/api/v1/messages")
        ).json();
        messageId =
          data.messages.find(
            (m: { ID: string; Subject: string; To: { Address: string }[] }) =>
              m.Subject.includes(subject) &&
              m.To.some((to) => to.Address === email),
          )?.ID ?? "";
        return !!messageId;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  const message = await (
    await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`)
  ).json();
  const url = message.HTML.match(/href="([^"]+)"/)?.[1]?.replaceAll(
    "&amp;",
    "&",
  );
  expect(new URL(url).hostname).toBe("127.0.0.1");
  return url as string;
}
async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
}
test("staff invitation, provisioning, roles, HTTP-only refresh, recovery, denial and deactivation", async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.setTimeout(120000);
  const suffix = randomUUID().slice(0, 8),
    email = `e2e-staff-${suffix}@example.test`,
    dualEmail = `e2e-dual-${suffix}@example.test`,
    outsiderEmail = `e2e-outsider-${suffix}@example.test`;
  const password = `Tennora!${randomUUID()}`,
    newPassword = `New!${randomUUID()}`;
  const admin = createClient<Database>(backend!, adminKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userIds: string[] = [];
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  try {
    const created = await admin.auth.admin.inviteUserByEmail(email, {
      data: { display_name: "Staff Organizer" },
    });
    expect(created.error).toBeNull();
    expect(created.data.user!.email_confirmed_at).toBeFalsy();
    userIds.push(created.data.user!.id);
    // Fixtures explicitly seed staff authority; service-only bootstrap is proved transactionally in pgTAP.
    // This keeps the suite usable after a real Organizer exists in the local database.
    expect(
      (
        await admin
          .from("staff_accounts")
          .insert({ id: userIds[0], email, display_name: "Staff Organizer" })
      ).error,
    ).toBeNull();
    expect(
      (
        await admin
          .from("staff_roles")
          .insert({ user_id: userIds[0], role: "organizer" })
      ).error,
    ).toBeNull();
    await page.goto(await emailLink(request, email, "Set up your Tennora"));
    await expect(page).toHaveURL(/\/ru\/reset-password$/);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page
      .getByRole("button", { name: "Задать пароль", exact: true })
      .click();
    await expect(
      page.getByText("Пароль обновлён.", { exact: true }),
    ).toBeVisible();
    expect(
      (await admin.auth.admin.getUserById(userIds[0])).data.user
        ?.email_confirmed_at,
    ).toBeTruthy();
    const outsider = await admin.auth.admin.createUser({
      email: outsiderEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Unrelated Legacy", roles: ["organizer"] },
    });
    expect(outsider.error).toBeNull();
    userIds.push(outsider.data.user!.id);
    const anon = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (
        await anon.auth.signUp({
          email: `e2e-blocked-${suffix}@example.test`,
          password,
        })
      ).error,
    ).not.toBeNull();
    await login(page, email, password);
    let cookies = (await page.context().cookies()).filter((c) =>
      c.name.includes("auth-token"),
    );
    expect(cookies.length).toBeGreaterThan(0);
    expect(cookies.every((c) => c.httpOnly && c.sameSite === "Lax")).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "auth-token",
    );
    // Force the stored session expiry through the real server refresh path, retaining the actual signed JWT and refresh token.
    const base = cookies[0].name.replace(/\.\d+$/, "");
    const encoded = cookies
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.value)
      .join("");
    const session = JSON.parse(
      Buffer.from(encoded.slice(7), "base64url").toString(),
    );
    const previousRefresh = session.refresh_token;
    session.expires_at = 1;
    await page
      .context()
      .clearCookies({ name: new RegExp(`^${base.replaceAll(".", "\\.")}`) });
    const value =
      "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
    await page.context().addCookies([{ ...cookies[0], name: base, value }]);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Workspace", exact: true }),
    ).toBeVisible();
    cookies = (await page.context().cookies()).filter((c) =>
      c.name.includes("auth-token"),
    );
    const refreshed = JSON.parse(
      Buffer.from(
        cookies
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => c.value)
          .join("")
          .slice(7),
        "base64url",
      ).toString(),
    );
    expect(refreshed.refresh_token).not.toBe(previousRefresh);
    expect(cookies.every((c) => c.httpOnly)).toBe(true);
    await page.goto("/en/organizer/staff");
    const create = page.getByRole("form", {
      name: "Create staff account",
      exact: true,
    });
    await create.getByLabel("Name", { exact: true }).fill("Dual Staff");
    await create.getByLabel("Email address").fill(dualEmail);
    await create
      .getByLabel("Initial password", { exact: false })
      .fill(password);
    await create.getByLabel("Trainer", { exact: true }).check();
    await create.getByLabel("Line Judge", { exact: true }).check();
    await create
      .getByRole("button", { name: "Create staff account", exact: true })
      .click();
    await expect(
      page.getByText("Staff account created.", { exact: false }),
    ).toBeVisible();
    const dual = await admin
      .from("staff_accounts")
      .select("id,staff_roles(role)")
      .eq("email", dualEmail)
      .single();
    expect(dual.error).toBeNull();
    userIds.push(dual.data!.id);
    expect(dual.data!.staff_roles.map((r) => r.role).sort()).toEqual([
      "line_judge",
      "trainer",
    ]);
    const second = await context.newPage();
    await login(second, dualEmail, password);
    await second.goto("/en/organizer/staff");
    await expect(
      second.getByRole("heading", { name: /This page isn.t available/ }),
    ).toBeVisible();
    expect(await second.content()).not.toContain(email);
    const userClient = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (await userClient.auth.signInWithPassword({ email: dualEmail, password }))
        .error,
    ).toBeNull();
    expect(
      (
        await userClient.rpc("change_staff", {
          target: userIds[0],
          desired_roles: ["trainer"],
          is_active: false,
        })
      ).error?.code,
    ).toBe("42501");
    await page.goto("/kk/organizer/staff");
    await expect(
      page.getByRole("heading", { name: "Қызметкерлер", exact: true }),
    ).toBeVisible();
    await page.goto("/ru/organizer/staff");
    await expect(
      page.getByRole("heading", { name: "Сотрудники", exact: true }),
    ).toBeVisible();
    await page.goto("/en/organizer/staff");
    const dualCard = page
      .getByRole("heading", { name: "Dual Staff", exact: true })
      .locator("..");
    // Verify the Organizer reset path against real Auth, then keep the existing staff token for deactivation tests.
    await dualCard.locator("summary").click();
    await dualCard.locator('input[name="password"]').fill(newPassword);
    await dualCard.locator('input[name="confirmPassword"]').fill(newPassword);
    await dualCard
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(
      dualCard.getByText("Password updated.", { exact: true }),
    ).toBeVisible();
    const resetProbe = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (
        await resetProbe.auth.signInWithPassword({
          email: dualEmail,
          password: newPassword,
        })
      ).error,
    ).toBeNull();
    await resetProbe.auth.signOut();
    await page.screenshot({
      path: testInfo.outputPath("staff-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("staff-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await dualCard.getByLabel("Account access").selectOption("false");
    await dualCard
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      dualCard.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await second.goto("/en/workspace");
    await expect(second).toHaveURL(/\/en\/login(?:\?error=staff)?$/);
    expect((await userClient.from("staff_accounts").select("id")).data).toEqual(
      [],
    );
    expect(
      (
        await userClient.rpc("update_staff_name", {
          new_name: "Inactive Actor",
        })
      ).error?.code,
    ).toBe("42501");
    await dualCard.getByLabel("Account access").selectOption("true");
    await dualCard
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      dualCard.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await page.goto("/en/settings/profile");
    await page.getByLabel("Display name").fill("Updated Organizer");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue(
      "Updated Organizer",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/login$/);
    expect(
      (await page.context().cookies()).some(
        (c) => c.name.includes("auth-token") && c.value,
      ),
    ).toBe(false);
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/en\/forgot-password$/);
    await expect(
      page.getByRole("heading", { name: "Recover your account" }),
    ).toBeVisible();
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(
      page.getByText("If an account exists", { exact: false }),
    ).toBeVisible();
    await page.goto(await emailLink(request, email));
    await expect(page).toHaveURL(/\/(ru|en)\/reset-password$/);
    const recoveryLocale = page.url().includes("/ru/") ? "ru" : "en";
    await page.locator('input[name="password"]').fill(newPassword);
    await page.locator('input[name="confirmPassword"]').fill(newPassword);
    await page
      .getByRole("button", {
        name: recoveryLocale === "ru" ? "Задать пароль" : "Set password",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(
        recoveryLocale === "ru" ? "Пароль обновлён." : "Password updated.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.goto("/en/workspace");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await login(page, email, newPassword);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByLabel("Email address").fill(outsiderEmail);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("An active league staff account is required.", {
        exact: false,
      }),
    ).toBeVisible();
  } finally {
    await context.close();
    // Disposable local-only fixtures. Never delete real league records.
    const jobs = await admin
      .from("staff_jobs")
      .select("target_id")
      .like("email", `%${suffix}@example.test`);
    for (const j of jobs.data ?? [])
      if (!userIds.includes(j.target_id)) userIds.push(j.target_id);
    await admin.from("audit_logs").delete().in("actor_id", userIds);
    await admin.from("staff_jobs").delete().in("actor_id", userIds);
    await admin.from("staff_roles").delete().in("user_id", userIds);
    await admin.from("staff_accounts").delete().in("id", userIds);
    for (const id of userIds)
      expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});
