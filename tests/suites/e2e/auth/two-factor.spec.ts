import { randomUUID } from "node:crypto";
import { expect, requires, test } from "#harness/playwright";
import { createAuthenticatorApp, enableTwoFactor } from "#shared/auth";
import { skipPasskeyPrompt, submitLogin } from "#shared/auth-pages";

test.describe("two-factor authentication", () => {
	requires("harness:outbox", "auth:password");
	test.use({ storageState: { cookies: [], origins: [] } });

	test("asks for a code after the password, or a recovery code instead", async ({
		lucid,
		page,
	}) => {
		const user = await lucid.user();
		const { app, recoveryCodes } = await enableTwoFactor(user.session);

		await page.goto("/admin/login");
		await submitLogin(page, user.credentials);
		await expect(page).toHaveURL(/\/admin\/two-factor/);
		//* a full authenticator code sends itself
		await page
			.getByRole("textbox", { name: "Authenticator Code" })
			.fill(await app.code());
		await skipPasskeyPrompt(page);
		await expect(page).toHaveURL(/\/admin$/);

		await page.context().clearCookies();
		await page.goto("/admin/login");
		await submitLogin(page, user.credentials);
		await page
			.getByRole("button", { name: "Use a recovery code instead" })
			.click();
		await page
			.getByRole("textbox", { name: "Recovery Code" })
			.fill(recoveryCodes[0] ?? "");
		await page.getByRole("button", { name: "Verify" }).click();
		//* "Not Now" earlier keeps the passkey prompt away from this browser for a while
		await expect(page).toHaveURL(/\/admin$/);
	});

	test("makes a user whose role requires it set up an app before they get in", async ({
		lucid,
		page,
	}) => {
		const admin = await lucid.admin();
		const role = await admin.request<{ data: { id: number } }>({
			method: "POST",
			path: "/api/v1/roles",
			body: {
				name: `Two-factor ${randomUUID()}`,
				permissions: [],
				requireTwoFactor: true,
			},
		});
		const { credentials, token } = await lucid.invite({
			roleIds: [role.body.data.id],
		});
		await lucid.session().request({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${token}`,
			body: {
				password: credentials.password,
				passwordConfirmation: credentials.password,
			},
		});

		await page.goto("/admin/login");
		await submitLogin(page, credentials);
		await expect(
			page.getByRole("heading", { name: "Set Up Two-Factor Authentication" }),
		).toBeVisible();
		//* the key someone types in when they can't scan the QR code, shown in groups of four
		const key = page.getByRole("button", { name: "Copy key" });
		const app = createAuthenticatorApp(
			((await key.textContent()) ?? "").replaceAll(/\s/g, ""),
		);
		await page
			.getByRole("textbox", { name: "Authenticator Code" })
			.fill(await app.code());

		await expect(
			page.getByRole("heading", { name: "Save Your Recovery Codes" }),
		).toBeVisible();
		await page.getByRole("button", { name: "I've Saved My Codes" }).click();
		await page.getByRole("button", { name: "Click Again to Continue" }).click();
		await skipPasskeyPrompt(page);
		await expect(page).toHaveURL(/\/admin$/);
	});
});
