import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("homepage loads and displays title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("uberSKILLS");
    await expect(page.getByRole("heading", { name: "uberSKILLS" })).toBeVisible();
  });

  test("homepage displays description", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText("Design, test, and deploy Claude Code Agent Skills."),
    ).toBeVisible();
  });
});
