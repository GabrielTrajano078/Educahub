import { expect, test } from "@playwright/test";

test.describe("Painel autenticado", () => {
  test("admin vê métricas do dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
    await expect(page.getByText("Turmas acessíveis")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver provas" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Nova prova" })).toBeVisible();
  });
});
