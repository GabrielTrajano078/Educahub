import { expect, test } from "@playwright/test";

test.describe("Rotas protegidas", () => {
  test("visitante em / é redirecionado para login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("rota inexistente redireciona para home e depois login", async ({ page }) => {
    await page.goto("/rota-inexistente-e2e");
    await expect(page).toHaveURL(/\/login$/);
  });
});
