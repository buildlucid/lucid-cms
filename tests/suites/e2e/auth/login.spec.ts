import { expect, test } from "#harness/playwright";

test.describe("signed-in admin", () => {
	test("opens the admin without being sent to the login page", async ({
		page,
	}) => {
		await page.goto("/admin");
		await page.waitForLoadState("networkidle");

		await expect(page).not.toHaveURL(/login/);
		expect((await page.request.get("/api/v1/account")).status()).toBe(200);
	});
});

test.describe("visitor who is not signed in", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("is sent to the login page", async ({ page }) => {
		await page.goto("/admin");

		await expect(page).toHaveURL(/login/);
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});
});
