import { ADMIN, describe, expect, login, test } from "#harness/vitest";

describe("password login", () => {
	test("signs in the seeded admin", async ({ lucid }) => {
		const admin = await lucid.admin();

		const account = await admin.request<{ data: { username: string } }>({
			path: "/api/v1/account",
		});

		expect(account.status).toBe(200);
		expect(account.body.data.username).toBe(ADMIN.username);
	});

	test("refuses a wrong password", async ({ lucid }) => {
		const visitor = lucid.session();

		await expect(
			login(visitor, {
				username: ADMIN.username,
				password: "not-the-password",
			}),
		).rejects.toThrow("401");
	});

	test("keeps the account private from visitors who are not signed in", async ({
		lucid,
	}) => {
		const account = await lucid.session().request({ path: "/api/v1/account" });

		expect(account.status).toBe(401);
	});
});
