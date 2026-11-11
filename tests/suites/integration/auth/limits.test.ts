import { randomUUID } from "node:crypto";
import {
	advanceClock,
	describe,
	expect,
	requires,
	test,
} from "#harness/vitest";
import { sendLogin } from "#shared/auth";

/** Wrong passwords allowed per account, and per address, in 15 minutes. */
const ACCOUNT_LIMIT = 10;
const ADDRESS_PASSWORD_LIMIT = 30;
/** Sign-in requests allowed per address in a minute, on setups with a KV store. */
const ADDRESS_LIMIT = 10;

describe("sign-in limits", () => {
	requires("harness:outbox", "auth:password");

	test("stop an account's password checks after ten wrong ones, from any address", async ({
		lucid,
	}) => {
		const { credentials } = await lucid.user();
		const wrong = { ...credentials, password: "not-the-password" };

		//* each attempt comes from its own address, so only the account's own limit applies
		for (let attempt = 0; attempt < ACCOUNT_LIMIT; attempt++) {
			expect((await sendLogin(lucid.session(), wrong)).status).toBe(401);
		}
		const limited = await sendLogin(lucid.session(), wrong);
		expect(limited.status).toBe(429);
		//* the right password waits too, or guesses could carry on
		expect((await sendLogin(lucid.session(), credentials)).status).toBe(429);
	});

	test("count unknown accounts the same, so they can't be told apart", async ({
		lucid,
	}) => {
		const unknown = {
			username: `nobody-${randomUUID()}`,
			password: "not-the-password",
		};
		for (let attempt = 0; attempt < ACCOUNT_LIMIT; attempt++) {
			expect((await sendLogin(lucid.session(), unknown)).status).toBe(401);
		}
		expect((await sendLogin(lucid.session(), unknown)).status).toBe(429);
	});
});

describe("password limits per address", () => {
	//* the clock moves past the per-minute limit that setups with a KV store add
	requires("harness:outbox", "auth:password", "mode:host");

	test("stop one address after thirty wrong passwords, whichever accounts they name", async ({
		lucid,
	}) => {
		const visitor = lucid.session();
		const attempt = () =>
			sendLogin(visitor, {
				username: `nobody-${randomUUID()}`,
				password: "not-the-password",
			});

		for (let index = 0; index < ADDRESS_PASSWORD_LIMIT; index++) {
			if (index > 0 && index % ADDRESS_LIMIT === 0) {
				advanceClock(61_000);
			}
			expect((await attempt()).status).toBe(401);
		}
		advanceClock(61_000);
		expect((await attempt()).status).toBe(429);

		//* other addresses carry on
		const { credentials } = await lucid.user();
		expect((await sendLogin(lucid.session(), credentials)).status).toBe(200);
	});
});

describe("sign-in limits per address", () => {
	//* addresses are counted in the KV store, which only some setups have
	requires("harness:outbox", "auth:password", "plugin:sqlite-kv");

	test("stop one address after ten sign-in requests a minute, and say when to try again", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		const visitor = lucid.session();
		const attempt = (index: number) =>
			sendLogin(visitor, {
				username: `someone-${randomUUID()}-${index}`,
				password: "not-the-password",
			});

		for (let index = 0; index < ADDRESS_LIMIT; index++) {
			expect((await attempt(index)).status).toBe(401);
		}
		const limited = await attempt(ADDRESS_LIMIT);
		expect(limited.status).toBe(429);
		expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);

		//* other addresses carry on
		expect((await sendLogin(lucid.session(), user.credentials)).status).toBe(
			200,
		);
	});

	test("leave session refreshes out, so a busy office isn't signed out", async ({
		lucid,
	}) => {
		const user = await lucid.user();
		for (let index = 0; index < ADDRESS_LIMIT * 2; index++) {
			const refreshed = await user.session.request({
				method: "POST",
				path: "/api/v1/auth/token",
			});
			expect(refreshed.status, `refresh ${index}`).toBe(204);
		}
	});
});
