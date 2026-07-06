import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /superpower/i })).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Welcome back")).toBeVisible();
});

test("demo login redirects to dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@potentially.ai");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");
});

test("search page loads", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByPlaceholder(/network across all groups/i)).toBeVisible();
});

test("groups page loads", async ({ page }) => {
  await page.goto("/groups");
  await expect(page.getByText("Your Groups")).toBeVisible();
});

test("workspace route redirects to groups", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL("/groups");
});

test("playbooks page loads in demo", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@potentially.ai");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.goto("/playbooks");
  await expect(page.getByText("Warm-path-first outreach")).toBeVisible();
});

test("segments page loads in demo", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@potentially.ai");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/segments");
  await expect(page.getByText("Saved contact lists")).toBeVisible();
});
