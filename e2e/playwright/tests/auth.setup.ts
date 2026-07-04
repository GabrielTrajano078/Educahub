import { expect, test as setup } from "@playwright/test";
import { AUTH_STORAGE_PATH } from "../fixtures/e2e-auth.constants";
import { readE2eCredentials } from "../fixtures/e2e-auth";

setup("autenticar administrador", async ({ page }) => {
  const { email, password } = readE2eCredentials();

  await page.goto("/login");
  await page.getByRole("textbox", { name: /E-mail/ }).fill(email);
  await page.getByRole("textbox", { name: /Senha/ }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: AUTH_STORAGE_PATH });
});
