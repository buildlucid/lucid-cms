import { afterAll, beforeAll, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import grantSuperAdmin from "./grant-super-admin.js";
import resetTwoFactor from "./reset-two-factor.js";

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

const readAuditLog = (userId: number) =>
	context.db.kysely
		.selectFrom("lucid_security_audit_logs")
		.select(["action", "performed_by", "previous_value", "new_value"])
		.where("user_id", "=", userId)
		.executeTakeFirstOrThrow();

test("the CLI resets a super admin's two-factor by email, with no user logged as making the change", async () => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "cli-two-factor@test.local",
			username: "cli-two-factor",
			secret: "test",
			super_admin: true,
			two_factor_secret: "secret",
			two_factor_enabled_at: new Date().toISOString(),
		})
		.returning("id")
		.executeTakeFirstOrThrow();

	expect(
		await resetTwoFactor(context, { email: " CLI-Two-Factor@test.local " }),
	).toEqual({ error: undefined, data: undefined });
	expect(
		(await resetTwoFactor(context, { email: "cli-two-factor@test.local" }))
			.error?.status,
	).toBe(400);

	const updated = await context.db.kysely
		.selectFrom("lucid_users")
		.select(["two_factor_secret", "two_factor_enabled_at"])
		.where("id", "=", user.id)
		.executeTakeFirstOrThrow();
	expect(updated).toEqual({
		two_factor_secret: null,
		two_factor_enabled_at: null,
	});
	expect(await readAuditLog(user.id)).toMatchObject({
		action: constants.securityAudit.actions.twoFactorChange,
		performed_by: null,
	});
});

test("the CLI makes an existing user a super admin, with no user logged as making the change", async () => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "cli-super-admin@test.local",
			username: "cli-super-admin",
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();

	expect(
		(await grantSuperAdmin(context, { email: "missing@test.local" })).error
			?.status,
	).toBe(404);
	expect(
		await grantSuperAdmin(context, { email: "cli-super-admin@test.local" }),
	).toEqual({ error: undefined, data: undefined });
	expect(
		(await grantSuperAdmin(context, { email: "cli-super-admin@test.local" }))
			.error?.status,
	).toBe(400);

	const updated = await context.db.kysely
		.selectFrom("lucid_users")
		.select("super_admin")
		.where("id", "=", user.id)
		.executeTakeFirstOrThrow();
	expect(Boolean(updated.super_admin)).toBe(true);
	expect(await readAuditLog(user.id)).toEqual({
		action: constants.securityAudit.actions.roleChange,
		performed_by: null,
		previous_value: JSON.stringify({ roles: [], superAdmin: false }),
		new_value: JSON.stringify({ roles: [], superAdmin: true }),
	});
});
