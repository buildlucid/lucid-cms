import { afterAll, beforeAll, expect, test } from "vitest";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import hashSecret from "../../utils/helpers/hash-secret.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import login from "./login.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});

test("a locked or suspended account only says so to someone with its password", async () => {
	const { secret, encryptSecret } = generateSecret(
		context.config.secrets.encryption,
	);
	await context.db.kysely
		.insertInto("lucid_users")
		.values([
			{
				email: "locked@test.local",
				username: "locked",
				password: await hashSecret("right-password", secret),
				secret: encryptSecret,
				invitation_accepted: true,
				is_locked: true,
				is_deleted: false,
			},
			{
				email: "suspended@test.local",
				username: "suspended",
				password: await hashSecret("right-password", secret),
				secret: encryptSecret,
				invitation_accepted: true,
				is_locked: false,
				is_deleted: true,
			},
		])
		.execute();

	const attempt = async (usernameOrEmail: string, password: string) =>
		(await login(context, { usernameOrEmail, password })).error?.message;

	expect(await attempt("locked", "wrong-password")).toEqual(
		copy("server:core.auth.login.error.message"),
	);
	expect(await attempt("suspended", "wrong-password")).toEqual(
		copy("server:core.auth.login.error.message"),
	);
	expect(await attempt("nobody", "wrong-password")).toEqual(
		copy("server:core.auth.login.error.message"),
	);
	expect(await attempt("locked", "right-password")).toEqual(
		copy("server:core.auth.login.locked.error.message"),
	);
	expect(await attempt("suspended", "right-password")).toEqual(
		copy("server:core.auth.login.suspended.error.message"),
	);
});

test("wrong passwords are limited per account, and right ones aren't counted", async () => {
	const { secret, encryptSecret } = generateSecret(
		context.config.secrets.encryption,
	);
	await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "limited@test.local",
			username: "limited",
			password: await hashSecret("right-password", secret),
			secret: encryptSecret,
			invitation_accepted: true,
			is_locked: false,
			is_deleted: false,
		})
		.execute();

	const attempt = (usernameOrEmail: string, password: string) =>
		login(context, { usernameOrEmail, password });

	for (let i = 0; i < 9; i++) {
		await attempt(i % 2 ? "limited" : "LIMITED@test.local", "wrong-password");
	}
	expect((await attempt("limited", "right-password")).data).toBeDefined();
	expect((await attempt("limited", "wrong-password")).error?.status).toBe(401);
	expect((await attempt("limited", "right-password")).error?.status).toBe(429);
});

test("unknown accounts reach the limit like real ones", async () => {
	for (let i = 0; i < 10; i++) {
		await login(context, {
			usernameOrEmail: "Nobody@test.local",
			password: "wrong-password",
		});
	}
	const res = await login(context, {
		usernameOrEmail: "nobody@test.local",
		password: "wrong-password",
	});
	expect(res.error?.status).toBe(429);
});
