import { describe, expect, test } from "#harness/vitest";

describe("connecting to Lucid", () => {
	test("registers the CMS with Lucid's API and sends the admin to sign in there", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const started = await admin.request<{ data: { authorizationUrl: string } }>(
			{
				method: "POST",
				path: "/api/v1/connection/connect",
			},
		);
		expect(started.status).toBe(200);

		//* the harness stands in for Lucid's API, so this never reaches Lucid's servers
		const signIn = new URL(started.body.data.authorizationUrl);
		expect(signIn.pathname).toBe("/oauth/authorize");
		expect(signIn.searchParams.get("client_id")).toBeTruthy();
		expect(signIn.searchParams.get("redirect_uri")).toBe(
			`${lucid.url}/api/v1/connection/callback`,
		);
	});
});
