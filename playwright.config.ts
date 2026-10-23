import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const localEnvironment = resolve(process.cwd(), ".env.e2e.local");
if (existsSync(localEnvironment)) process.loadEnvFile(localEnvironment);

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Copy .env.e2e.example to .env.e2e.local and set it.`);
  return value;
}

const baseUrl = new URL(requiredEnvironment("E2E_BASE_URL"));
const expectedConvexUrl = new URL(requiredEnvironment("E2E_EXPECTED_CONVEX_URL"));

if (
  baseUrl.protocol !== "https:" ||
  !/^deploy-preview-\d+--local-cart-lesotho\.netlify\.app$/i.test(baseUrl.hostname)
) {
  throw new Error("E2E_BASE_URL must be an HTTPS local-cart-lesotho Netlify Deploy Preview URL.");
}

if (
  expectedConvexUrl.protocol !== "https:" ||
  !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.convex\.cloud$/i.test(expectedConvexUrl.hostname)
) {
  throw new Error("E2E_EXPECTED_CONVEX_URL must be the HTTPS URL of a Convex development deployment.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: ".playwright-e2e-output/results",
  reporter: "list",
  use: {
    baseURL: baseUrl.origin,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
});
