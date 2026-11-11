import { randomUUID } from "node:crypto";
import {
	ADMIN,
	describe,
	expect,
	migratedTo,
	requires,
	test,
} from "#harness/vitest";
import {
	addPasskey,
	enableTwoFactor,
	isSignedIn,
	sendLogin,
	signInWithPasskey,
} from "#shared/auth";

describe("lockout recovery from the command line", () => {
	requires("mode:host", "auth:password");

	test("gets a super admin who lost their app and passkey back in", async ({
		migrations,
	}) => {
		const database = await migrations.database(migratedTo(null));
		const passkey = await database.cms(null, async (admin, server) => {
			await enableTwoFactor(admin);
			return addPasskey(admin, server.url);
		});

		const resetApp = await database.cli(
			null,
			"users:reset-two-factor",
			ADMIN.email,
			"--yes",
		);
		expect(resetApp.code, resetApp.output).toBe(0);
		const resetPasskeys = await database.cli(
			null,
			"users:reset-passkeys",
			ADMIN.email,
			"--yes",
		);
		expect(resetPasskeys.code, resetPasskeys.output).toBe(0);

		//* the fixture's own login would stop at a two-factor step if the app were still on
		await database.cms(null, async (_admin, server) => {
			const withPasskey = server.session();
			expect((await signInWithPasskey(withPasskey, passkey)).ok).toBe(false);
		});
	});

	test("gives a user a temporary password and makes them a super admin", async ({
		migrations,
	}) => {
		const database = await migrations.database(migratedTo(null));
		const email = `locked-out-${randomUUID()}@harness.test`;
		await database.cms(null, async (admin) => {
			const invited = await admin.request({
				method: "POST",
				path: "/api/v1/users",
				body: {
					email,
					username: `user${randomUUID().slice(0, 8)}`,
					roleIds: [],
					superAdmin: false,
				},
			});
			expect(invited.ok, JSON.stringify(invited.body)).toBe(true);
		});

		const promoted = await database.cli(
			null,
			"users:super-admin",
			email,
			"--yes",
		);
		expect(promoted.code, promoted.output).toBe(0);
		const reset = await database.cli(
			null,
			"users:reset-password",
			email,
			"--yes",
		);
		expect(reset.code, reset.output).toBe(0);
		const temporary = reset.output.match(/Temporary password: (\S+)\./)?.[1];
		expect(temporary).toBeDefined();

		await database.cms(null, async (_admin, server) => {
			const visitor = server.session();
			const login = await sendLogin(visitor, {
				username: email,
				password: temporary ?? "",
			});
			expect(login.status).toBe(200);
			expect(await isSignedIn(visitor)).toBe(true);

			const account = await visitor.request<{
				data: { superAdmin: boolean; triggerPasswordReset: boolean };
			}>({ path: "/api/v1/account" });
			expect(account.body.data).toMatchObject({
				superAdmin: true,
				triggerPasswordReset: true,
			});
		});
	});
});
