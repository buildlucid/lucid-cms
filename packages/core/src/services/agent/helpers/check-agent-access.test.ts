import { afterAll, expect, test } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import checkAgentAccess from "./check-agent-access.js";

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

test("agent access follows live roles, revocation and account locks", async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	const context = createServiceContext({
		config,
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "agent-access@test.local",
			username: "agent-access",
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({
			name: "Agent editor",
			description: null,
			key: null,
			locked: false,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: user.id, role_id: role.id })
		.execute();
	expect(await checkAgentAccess(context, { userId: user.id })).toMatchObject({
		error: { status: 403 },
	});

	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values([
			{ role_id: role.id, permission: Permissions.AiAgentUse, core: true },
			{ role_id: role.id, permission: Permissions.MediaUpdate, core: true },
		])
		.execute();
	expect(await checkAgentAccess(context, { userId: user.id })).toMatchObject({
		data: {
			userId: user.id,
			superAdmin: false,
			permissions: expect.arrayContaining([
				Permissions.AiAgentUse,
				Permissions.MediaUpdate,
			]),
		},
	});

	await context.db.kysely
		.deleteFrom("lucid_role_permissions")
		.where("role_id", "=", role.id)
		.where("permission", "=", Permissions.MediaUpdate)
		.execute();
	expect(
		(await checkAgentAccess(context, { userId: user.id })).data?.permissions,
	).toEqual([Permissions.AiAgentUse]);
	await context.db.kysely
		.deleteFrom("lucid_role_permissions")
		.where("role_id", "=", role.id)
		.execute();
	expect(await checkAgentAccess(context, { userId: user.id })).toMatchObject({
		error: { status: 403 },
	});

	await context.db.kysely
		.updateTable("lucid_users")
		.set({ super_admin: true })
		.where("id", "=", user.id)
		.execute();
	expect(await checkAgentAccess(context, { userId: user.id })).toMatchObject({
		data: { superAdmin: true },
	});
	await context.db.kysely
		.updateTable("lucid_users")
		.set({ is_locked: true })
		.where("id", "=", user.id)
		.execute();
	expect(await checkAgentAccess(context, { userId: user.id })).toMatchObject({
		error: { status: 401 },
	});
});
