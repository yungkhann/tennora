import { randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
// This suite mutates disposable fixtures and must never target a hosted project.
const local = backend && new URL(backend).hostname === "127.0.0.1";
test.skip(
  !local || !adminKey,
  "Requires an explicitly configured local Supabase test backend.",
);

async function emailLink(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  let messageId = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          "http://127.0.0.1:54324/api/v1/messages",
        );
        const data: {
          messages: {
            ID: string;
            Subject: string;
            To: { Address: string }[];
          }[];
        } = await response.json();
        const message = data.messages.find(
          (m) =>
            m.Subject.includes(subject) &&
            m.To.some((to) => to.Address === email),
        );
        messageId = message?.ID ?? "";
        return !!messageId;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  const response = await request.get(
    `http://127.0.0.1:54324/api/v1/message/${messageId}`,
  );
  const message: { HTML: string } = await response.json();
  const url = message.HTML.match(/href="([^"]+)"/)?.[1]?.replaceAll(
    "&amp;",
    "&",
  );
  expect(url).toBeTruthy();
  expect(new URL(url!).hostname).toBe("127.0.0.1");
  return url!;
}

test("real registration, confirmation, login, profile, tenant onboarding, isolation and recovery", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90000);
  const id = randomUUID().slice(0, 8);
  const email = `tennora-${id}@example.test`;
  const password = `Tennora!${randomUUID()}`;
  const newPassword = `Fresh!${randomUUID()}`;
  const admin = createClient<Database>(backend!, adminKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const organizationIds: string[] = [];
  const userIds: string[] = [];
  try {
    await page.goto("/register");
    await page.getByLabel("Your name").fill("Court Tester");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      page.getByText("Check your inbox", { exact: false }),
    ).toBeVisible();
    const { data: users, error: listError } =
      await admin.auth.admin.listUsers();
    expect(listError).toBeNull();
    const account = users.users.find((u) => u.email === email);
    expect(account).toBeTruthy();
    userIds.push(account!.id);
    expect(account!.email_confirmed_at).toBeFalsy();
    await page.goto(await emailLink(request, email, "Confirm"));
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Make room for your club" }),
    ).toBeVisible();

    await page.getByLabel("Organization name").fill("Court Test Club");
    await page.getByLabel("Organization address").fill(`court-test-${id}`);
    await page
      .getByRole("button", { name: "Create organization", exact: true })
      .click();
    await expect(
      page.getByText("Workspace ready", { exact: true }),
    ).toBeVisible();
    organizationIds.push(page.url().split("/").at(-1)!);
    await page.screenshot({
      path: testInfo.outputPath("organization-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("organization-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, actor_id")
      .eq("organization_id", organizationIds[0]);
    expect(audit).toEqual([
      { action: "organization.created", actor_id: account!.id },
    ]);

    await page.getByRole("link", { name: "Your profile", exact: true }).click();
    await page.getByLabel("Display name").fill("Updated Court Tester");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(
      page.getByText("Your profile has been saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue(
      "Updated Court Tester",
    );

    const { data: outsider, error: outsiderError } =
      await admin.auth.admin.createUser({
        email: `outsider-${id}@example.test`,
        password,
        email_confirm: true,
      });
    expect(outsiderError).toBeNull();
    userIds.push(outsider.user!.id);
    const outsiderClient = createClient<Database>(
      backend!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: outsiderLoginError } =
      await outsiderClient.auth.signInWithPassword({
        email: `outsider-${id}@example.test`,
        password,
      });
    expect(outsiderLoginError).toBeNull();
    const { data: privateOrgId, error: orgError } = await outsiderClient.rpc(
      "create_organization",
      {
        organization_name: "Private Outsider Club",
        organization_slug: `private-${id}`,
      },
    );
    expect(orgError).toBeNull();
    organizationIds.push(privateOrgId!);
    await outsiderClient.auth.signOut();
    await page.goto(`/dashboard/organizations/${privateOrgId}`);
    await expect(
      page.getByRole("heading", { name: /This page isn.t available/ }),
    ).toBeVisible();
    await expect(page.getByText("Private Outsider Club")).toHaveCount(0);

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/settings/profile");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("Unable to sign in.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveValue(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Court Test Club" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(
      page.getByText("If an account exists", { exact: false }),
    ).toBeVisible();
    await page.goto(await emailLink(request, email, "Reset"));
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(
      page.getByText("Your password has been updated.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Return to workspace" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally {
    // Remove test audit first: the production FK deliberately restricts organization deletion.
    if (organizationIds.length) {
      await admin
        .from("audit_logs")
        .delete()
        .in("organization_id", organizationIds);
      await admin.from("organizations").delete().in("id", organizationIds);
    }
    for (const userId of userIds) await admin.auth.admin.deleteUser(userId);
  }
});
