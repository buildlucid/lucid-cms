import { expect, type Page, requires, test } from "#harness/playwright";
import { linkToken } from "#shared/auth";
import { skipPasskeyPrompt, submitLogin } from "#shared/auth-pages";

/** Logs in on the login page, then skips the passkey prompt that follows. */
const logIn = async (
	page: Page,
	credentials: { username: string; password: string },
) => {
	await submitLogin(page, credentials);
	await skipPasskeyPrompt(page);
};

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

test.describe("logging in", () => {
	requires("harness:outbox", "auth:password");
	test.use({ storageState: { cookies: [], origins: [] } });

	test("with a password goes back to the page that asked for it", async ({
		lucid,
		page,
	}) => {
		const { credentials } = await lucid.user();

		await page.goto("/admin/account");
		await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin%2Faccount/);
		await logIn(page, credentials);
		await expect(page).toHaveURL(/\/admin\/account$/);
	});

	test("with a wrong password says so and stays on the login page", async ({
		lucid,
		page,
	}) => {
		const { credentials } = await lucid.user();

		await page.goto("/admin/login");
		await submitLogin(page, { ...credentials, password: "not-the-password" });

		await expect(
			page.getByText(
				"The username/email or password you entered is incorrect.",
			),
		).toBeVisible();
		await expect(page).toHaveURL(/\/admin\/login/);
	});

	test("after forgetting the password, with the emailed reset link", async ({
		lucid,
		page,
	}) => {
		const { credentials } = await lucid.user();
		const password = "Harness-browser-password-4!";

		await page.goto("/admin/login");
		await page.getByRole("link", { name: "Forgot Password?" }).click();
		await page.getByRole("textbox", { name: "Email" }).fill(credentials.email);
		await page
			.getByRole("button", { name: "Send Password Reset Link" })
			.click();
		const email = await lucid.email({
			to: credentials.email,
			template: "reset-password",
		});

		await page.goto(
			`/admin/reset-password?token=${linkToken(email, "resetLink")}`,
		);
		await page.getByRole("textbox", { name: /^Password/ }).fill(password);
		await page
			.getByRole("textbox", { name: /^Confirm Password/ })
			.fill(password);
		await page.getByRole("button", { name: "Reset Password" }).click();

		await expect(page).toHaveURL(/\/admin\/login/);
		await logIn(page, { username: credentials.username, password });
		await expect(page).toHaveURL(/\/admin$/);
	});
});

test.describe("an expired session", () => {
	requires("harness:outbox");

	test("renews itself while the refresh token lasts, then sends the user to log in", async ({
		lucid,
		pageAs,
	}) => {
		const user = await lucid.user();
		const page = await pageAs(user.session);

		//* the access token's cookie expires after five minutes
		await page.context().clearCookies({ name: "_access" });
		await page.goto("/admin/account");
		await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
		await expect(page).toHaveURL(/\/admin\/account$/);

		await user.session.request({
			method: "POST",
			path: "/api/v1/account/revoke-refresh-tokens",
		});
		await page.context().clearCookies({ name: "_access" });
		await page.goto("/admin/account");
		await expect(page).toHaveURL(/\/admin\/login/);
	});
});
