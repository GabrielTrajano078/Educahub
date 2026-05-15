import { expect, test } from "@playwright/test";

test.describe("Smoke UI", () => {
  test("página de login exibe título e formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Educahub" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /E-mail/ })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Senha/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("link para primeiro acesso aponta para signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Primeiro acesso/ }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "Educahub" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar administrador" })).toBeVisible();
  });
});
