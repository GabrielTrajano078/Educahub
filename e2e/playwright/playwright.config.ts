import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { AUTH_STORAGE_PATH } from "./fixtures/e2e-auth.constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const webDir = path.join(repoRoot, "web");

/** Padrão alinhado ao host do webServer (`--host 127.0.0.1`). */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
const skipWebServer = process.env.E2E_SKIP_WEB_SERVER === "1";
const headed = process.env.E2E_HEADED === "1";

const guestSpecs = /(smoke|routing|login-validation)\.spec\.ts/;
const authSpecs = /authenticated-.*\.spec\.ts/;

const browserMatrix = [
  { name: "chromium", device: "Desktop Chrome" },
  { name: "firefox", device: "Desktop Firefox" },
  { name: "webkit", device: "Desktop Safari" },
] as const;

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    headless: !headed,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    ...browserMatrix.map(({ name, device }) => ({
      name: `${name}-guest`,
      use: { ...devices[device] },
      testMatch: guestSpecs,
    })),
    ...browserMatrix.map(({ name, device }) => ({
      name,
      use: {
        ...devices[device],
        storageState: AUTH_STORAGE_PATH,
      },
      dependencies: ["setup"],
      testMatch: authSpecs,
    })),
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
        cwd: webDir,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
