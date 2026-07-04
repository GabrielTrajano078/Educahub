import { expect, test } from "@playwright/test";

test.describe("Navegação autenticada", () => {
  test("admin navega para turmas e provas pela sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();

    const sidebar = page.locator("#app-sidebar-nav");
    await sidebar.getByRole("link", { name: "Turmas" }).click();
    await expect(page).toHaveURL(/\/turmas$/);
    await expect(page.getByRole("heading", { name: "Turmas", exact: true })).toBeVisible();

    await sidebar.getByRole("link", { name: "Provas" }).click();
    await expect(page).toHaveURL(/\/provas$/);
    await expect(page.getByRole("heading", { name: "Provas", exact: true })).toBeVisible();
  });
});
