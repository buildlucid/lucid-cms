import { randomUUID } from "node:crypto";
import {
	addVirtualAuthenticator,
	expect,
	requires,
	test,
} from "#harness/playwright";
import { linkToken, signInWithProvider } from "#shared/auth";
import { skipPasskeyPrompt, submitLogin } from "#shared/auth-pages";
import { PROVIDERS } from "#shared/fragments/auth";

test.describe("signing in", () => {
	requires("harness:outbox");
	test.use({ storageState: { cookies: [], origins: [] } });

	test("with a passkey added from the account page", async ({
		lucid,
		pageAs,
	}) => {
		requires("auth:passkeys");
		const user = await lucid.user();
		const page = await pageAs(user.session);
		const authenticator = await addVirtualAuthenticator(page);

		await page.goto("/admin/account");
		await page.getByRole("button", { name: "Add Passkey" }).click();
		await expect(page.getByText("Passkey added")).toBeVisible();
		expect(await authenticator.credentials()).toHaveLength(1);

		await page.context().clearCookies();
		//* the login page offers the browser's passkeys as it opens, which this authenticator accepts
		await page.goto("/admin/login");
		//* and the prompt to add a passkey skips itself for someone who has one
		await expect(page).toHaveURL(/\/admin$/);
		await expect(page.getByRole("button", { name: "Account" })).toContainText(
			user.credentials.username,
		);
	});

	test("with a magic link, by opening the emailed link", async ({
		lucid,
		page,
	}) => {
		requires("auth:magicLink");
		const { credentials } = await lucid.user();

		await page.goto("/admin/login");
		await page.getByRole("link", { name: "Send Magic Link" }).click();
		await page.getByRole("textbox", { name: "Email" }).fill(credentials.email);
		await page.getByRole("button", { name: "Send Magic Link" }).click();
		await expect(
			page.getByRole("heading", { name: "Check Your Email" }),
		).toBeVisible();

		const email = await lucid.email({
			to: credentials.email,
			template: "magic-link",
		});
		await page.goto(
			`/admin/magic-link/verify?token=${linkToken(email, "loginLink")}`,
		);
		await expect(
			page.getByRole("heading", { name: "Finish Logging In" }),
		).toBeVisible();
		await page.getByRole("button", { name: "Log In" }).click();
		await skipPasskeyPrompt(page);
		await expect(page).toHaveURL(/\/admin$/);
	});

	test("with a magic link, by typing the emailed code", async ({
		lucid,
		page,
	}) => {
		requires("auth:magicLink");
		const { credentials } = await lucid.user();

		await page.goto("/admin/magic-link");
		await page.getByRole("textbox", { name: "Email" }).fill(credentials.email);
		await page.getByRole("button", { name: "Send Magic Link" }).click();
		const email = await lucid.email({
			to: credentials.email,
			template: "magic-link",
		});

		await page.getByRole("button", { name: "Enter Code Manually" }).click();
		//* the code logs in as soon as all six digits are in
		await page
			.getByRole("textbox", { name: "Login Code" })
			.fill(String(email.data.code));
		await skipPasskeyPrompt(page);
		await expect(page).toHaveURL(/\/admin$/);
	});

	test("with a provider, at the provider's own sign-in page", async ({
		lucid,
		page,
	}) => {
		requires("harness:identityProvider");
		const user = await lucid.user();
		const subject = randomUUID();
		await signInWithProvider(user.session, {
			provider: PROVIDERS.oauth,
			actionType: "authenticated-link",
			identity: { subject },
		});

		await page.goto("/admin/login");
		await page
			.getByRole("button", { name: "Continue With Harness OAuth" })
			.click();
		await page.getByRole("textbox", { name: "Account" }).fill(subject);
		await page.getByRole("button", { name: "Continue" }).click();
		await skipPasskeyPrompt(page);
		await expect(page).toHaveURL(/\/admin$/);
	});

	test("after accepting an invitation with a new password", async ({
		lucid,
		page,
	}) => {
		const { credentials, token } = await lucid.invite();

		await page.goto(`/admin/accept-invitation?token=${token}`);
		await page
			.getByRole("textbox", { name: /^Password/ })
			.fill(credentials.password);
		await page
			.getByRole("textbox", { name: /^Confirm Password/ })
			.fill(credentials.password);
		await page.getByRole("button", { name: "Accept Invitation" }).click();

		await expect(page).toHaveURL(/\/admin\/login/);
		await submitLogin(page, credentials);
		await skipPasskeyPrompt(page);
		await expect(page).toHaveURL(/\/admin$/);
	});
});

test.describe("confirming it's you", () => {
	requires("harness:outbox", "auth:passkeys");

	test("opens when a change needs it, then carries on with the change", async ({
		lucid,
		pageAs,
	}) => {
		const user = await lucid.user();
		const page = await pageAs(user.session);
		await addVirtualAuthenticator(page);
		//* the first request answers as an old login would, so the CMS asks the user to confirm
		let asked = false;
		await page.route("**/api/v1/account/passkeys/options", async (route) => {
			if (asked) {
				await route.continue();
				return;
			}
			asked = true;
			await route.fulfill({
				status: 403,
				json: {
					name: "Forbidden",
					message: "Confirm it's you to continue.",
					status: 403,
					code: "reauthentication_required",
				},
			});
		});

		await page.goto("/admin/account");
		await page.getByRole("button", { name: "Add Passkey" }).click();
		const modal = page.getByRole("dialog");
		await expect(
			modal.getByRole("heading", { name: "Confirm It's You" }),
		).toBeVisible();
		await modal
			.getByRole("textbox", { name: /^Password/ })
			.fill(user.credentials.password);
		await modal.getByRole("button", { name: "Confirm" }).click();

		await expect(page.getByText("Passkey added")).toBeVisible();
	});
});
