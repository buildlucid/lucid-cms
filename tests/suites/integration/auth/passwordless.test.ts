import { randomUUID } from "node:crypto";
import { describe, expect, requires, test, useVariant } from "#harness/vitest";
import { isSignedIn, sendLogin } from "#shared/helpers/auth";

useVariant("passwordless");
//* without passwords, everyone signs in through an email
requires("harness:outbox");

describe("without password login", () => {
	test("refuses passwords and password resets", async ({ lucid }) => {
		const user = await lucid.user();

		const login = await sendLogin(lucid.session(), {
			username: user.credentials.username,
			password: "any-password",
		});
		expect(login.status).toBe(400);
		expect(await isSignedIn(lucid.session())).toBe(false);

		const reset = await lucid.session().request({
			method: "POST",
			path: "/api/v1/account/reset-password",
			body: { email: user.credentials.email },
		});
		expect(reset.ok).toBe(false);
	});

	test("signs a user in when they accept their invitation", async ({
		lucid,
	}) => {
		const { token } = await lucid.invite();
		const visitor = lucid.session();

		const accepted = await visitor.request<{
			data: { twoFactor: string | null };
		}>({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${token}`,
			body: {},
		});
		expect(accepted.body.data.twoFactor).toBeNull();
		expect(await isSignedIn(visitor)).toBe(true);
	});

	test("still stops an invitation at the two-factor step when a role requires it", async ({
		lucid,
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
		const { token } = await lucid.invite({ roleIds: [role.body.data.id] });
		const visitor = lucid.session();

		const accepted = await visitor.request<{
			data: { twoFactor: string | null };
		}>({
			method: "POST",
			path: `/api/v1/auth/invitation/accept/${token}`,
			body: {},
		});
		expect(accepted.body.data.twoFactor).toBe("setup");
		expect(await isSignedIn(visitor)).toBe(false);
	});
});
