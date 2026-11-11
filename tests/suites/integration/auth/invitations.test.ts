import { describe, expect, requires, test } from "#harness/vitest";

describe("invitations", () => {
	requires("harness:outbox", "auth:password");

	test("an invited user sets a password from the email and signs in", async ({
		lucid,
	}) => {
		const { session, credentials } = await lucid.user();

		const account = await session.request<{
			data: { username: string; superAdmin: boolean };
		}>({ path: "/api/v1/account" });

		expect(account.status).toBe(200);
		expect(account.body.data).toMatchObject({
			username: credentials.username,
			superAdmin: false,
		});
	});
});
