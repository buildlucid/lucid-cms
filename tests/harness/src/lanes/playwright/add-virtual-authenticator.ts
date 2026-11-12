import type { Page } from "@playwright/test";

/**
 * Adds a Chromium-only virtual passkey authenticator that always passes user verification.
 * Passkeys belong to the browser context. The served server is at `localhost`, as browsers only
 * allow passkeys on a domain, and the login page offers its passkeys as soon as it opens.
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
