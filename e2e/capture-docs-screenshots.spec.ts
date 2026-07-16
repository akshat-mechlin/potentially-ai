/**
 * Capture real UI screenshots into public/docs for documentation.
 *
 * Prefers a demo server so shots are stable:
 *   NEXT_PUBLIC_DEMO_MODE=true npx next start -p 1021
 *   DOCS_SHOT_BASE_URL=http://localhost:1021 npx playwright test e2e/capture-docs-screenshots.spec.ts
 */
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "public", "docs");
const BASE = process.env.DOCS_SHOT_BASE_URL || "http://localhost:1020";

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill("demo@potentially.ai");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function dismissTour(page: import("@playwright/test").Page) {
  const skip = page.getByRole("button", { name: /skip|close|done/i }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => undefined);
  }
  // Click through tour if needed
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("button", { name: /next|→|>/i }).first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click().catch(() => undefined);
    await page.waitForTimeout(200);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
}

async function shot(
  page: import("@playwright/test").Page,
  name: string,
  target?: import("@playwright/test").Locator,
) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(500);
  const file = path.join(OUT, name);
  if (target && (await target.isVisible().catch(() => false))) {
    await target.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
}

test.describe.configure({ mode: "serial" });

test("capture docs screenshots from live app UI", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await dismissTour(page);

  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle");
  await dismissTour(page);
  await shot(page, "overview.png");

  await page.goto(`${BASE}/connectors`);
  await page.waitForLoadState("networkidle");
  await shot(page, "connect-data.png");

  // Prefer Custom Data / CSV import surface when present
  const customLink = page.getByRole("link", { name: /custom data/i }).first();
  if (await customLink.isVisible().catch(() => false)) {
    await customLink.click();
    await page.waitForLoadState("networkidle");
  }
  const importBtn = page.getByRole("button", { name: /import csv|upload|import/i }).first();
  if (await importBtn.isVisible().catch(() => false)) {
    await importBtn.click();
    await page.waitForTimeout(800);
  }
  await shot(page, "import-csv.png");
  await page.keyboard.press("Escape").catch(() => undefined);

  await page.goto(`${BASE}/search`);
  await page.waitForLoadState("networkidle");
  const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="Find"]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("Find CTOs in fintech");
  }
  await shot(page, "search-network.png");

  // Demo contact profile (Sarah Chen)
  await page.goto(`${BASE}/contact/ct-001`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await shot(page, "contact-profile.png");

  const mutualCard = page.locator("text=Mutual connections").locator("xpath=ancestor::*[self::div or self::section][1]").first();
  const mutualHeading = page.getByRole("heading", { name: /mutual connections/i }).first();
  if (await mutualHeading.isVisible().catch(() => false)) {
    await mutualHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    // Prefer the card container around the heading
    const card = page.locator("div").filter({ has: mutualHeading }).filter({ hasText: /linked|same company|mutual|lisa|works/i }).first();
    if (await card.isVisible().catch(() => false)) {
      await shot(page, "mutual-connections.png", card);
    } else {
      await shot(page, "mutual-connections.png", mutualCard);
    }
  } else {
    await shot(page, "mutual-connections.png");
  }

  await page.goto(`${BASE}/playbooks`);
  await page.waitForLoadState("networkidle");
  await page.getByText(/playbook|warm|outreach|create/i).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
  await shot(page, "segments-playbooks.png");

  // Group detail is more reliable than /groups list in some production demo builds
  await page.goto(`${BASE}/groups/demo-workspace-001`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  if (await page.getByText(/couldn't load/i).isVisible().catch(() => false)) {
    await page.goto(`${BASE}/segments`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  }
  await shot(page, "groups.png");
});
