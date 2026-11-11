import type { Page } from "@playwright/test";

/** Helpers for browser tests that go through the admin's sign-in pages. */

/** Fills the login page's form and sends it. */
export const submitLogin = async (
	page: Page,
	credentials: { username: string; password: string },
) => {
	await page
		.getByRole("textbox", { name: "Username or Email" })
		.fill(credentials.username);
	await page
		.getByRole("textbox", { name: /^Password/ })
		.fill(credentials.password);
	await page.getByRole("button", { name: "Login" }).click();
};

/** Passes the "Log In Faster Next Time" stop browsers that support passkeys make after logging in. */
export const skipPasskeyPrompt = async (page: Page) => {
	await page.getByRole("button", { name: "Not Now" }).click();
};
