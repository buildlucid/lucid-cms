import type { Page } from "@playwright/test";

/**
 * Adds a Chromium-only virtual passkey authenticator that always passes user verification.
 * Passkeys belong to the browser context.
 */
const addVirtualAuthenticator = async (page: Page) => {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send("WebAuthn.enable");
	const { authenticatorId } = await cdp.send(
		"WebAuthn.addVirtualAuthenticator",
		{
			options: {
				protocol: "ctap2",
				transport: "internal",
				hasResidentKey: true,
				hasUserVerification: true,
				isUserVerified: true,
				automaticPresenceSimulation: true,
			},
		},
	);

	return {
		/** The passkeys it holds. */
		credentials: async () =>
			(await cdp.send("WebAuthn.getCredentials", { authenticatorId }))
				.credentials,
	};
};

export default addVirtualAuthenticator;
