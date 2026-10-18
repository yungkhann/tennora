import { test, expect } from "@playwright/test";
test("public navigation, accessible theme persistence and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Настольный теннис. Каждый розыгрыш." }),
  ).toBeVisible();
  const before = await page.locator("html").getAttribute("class");
  await page.getByRole("button", { name: "Переключить цветовую тему" }).click();
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
  await page.getByRole("link", { name: "Матчи в эфире", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Матчи в эфире" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Вход для сотрудников", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ru\/login$/);
  await expect(page.getByLabel("Электронная почта")).toBeVisible();
  await page.goto("/register");
  await expect(page).toHaveURL(/\/ru\/login$/);
  await expect(
    page.getByText("Аккаунты сотрудников создаёт организатор.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("invalid callbacks fail closed without an external redirect", async ({
  page,
}) => {
  await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(/\/login\?error=callback$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Ссылка" }),
  ).toContainText("недействительна или устарела");
  await page.goto("/auth/confirm?token_hash=invalid&type=signup");
  await expect(page).toHaveURL(/\/login\?error=callback$/);
});
test("protected workspace requires authentication or explicit setup", async ({
  page,
}) => {
  const response = await page.goto("/dashboard");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page).toHaveURL(/\/ru\/login$/);
  await expect(
    page.getByRole("heading", { name: "Войти", exact: true }),
  ).toBeVisible();
});
test("keyboard skip link leads to main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "К содержимому" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});
