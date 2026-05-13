import { expect, test } from "@playwright/test";

test.describe("Smoke UI", () => {
  test("página de login exibe título e formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("link para primeiro acesso aponta para bootstrap", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Primeiro acesso/ }).click();
    await expect(page).toHaveURL(/\/bootstrap$/);
    await expect(page.getByRole("heading", { name: "Criar administrador" })).toBeVisible();
  });
});
