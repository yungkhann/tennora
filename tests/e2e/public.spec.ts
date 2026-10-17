import { test, expect } from "@playwright/test";
test("public navigation, accessible theme persistence and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A better day on court." }),
  ).toBeVisible();
  const before = await page.locator("html").getAttribute("class");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect
    .poll(() => page.locator("html").getAttribute("class"))
    .not.toBe(before);
  const after = await page.locator("html").getAttribute("class");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("class", after!);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Match center", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The courts are quiet for now" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await expect(
    page.getByText("At least 12 characters.", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("invalid callbacks fail closed without an external redirect", async ({
  page,
}) => {
  await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(/\/login\?error=callback$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "This link" }),
  ).toContainText("invalid or has expired");
  await page.goto("/auth/confirm?token_hash=invalid&type=invite");
  await expect(page).toHaveURL(/\/login\?error=callback$/);
});
test("protected workspace requires authentication or explicit setup", async ({
  page,
}) => {
  const response = await page.goto("/dashboard");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(
    page.getByRole("heading", {
      name: /Welcome back\.|Connect your workspace/,
    }),
  ).toBeVisible();
  if (
    await page.getByRole("heading", { name: "Connect your workspace" }).count()
  ) {
    await page.goto("/register");
    await expect(
      page.getByRole("button", { name: "Create account", exact: true }),
    ).toBeDisabled();
  }
});
test("keyboard skip link leads to main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});
