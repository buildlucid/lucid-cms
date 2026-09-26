import { afterAll, expect, test } from "vitest";
import defineAgent from "../../../libs/agent/define-agent.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { getAgentPermission } from "../../../libs/permission/agent-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import checkAgentAccess from "./check-agent-access.js";

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

test("agent access follows live roles per agent, revocation and account locks", async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	const agent = defineAgent({
		key: "seo",
		name: "SEO Agent",
		description: "Reviews metadata.",
		tools: [],
	});
	const context = createServiceContext({
		config: { ...config, ai: { ...config.ai, agents: [agent] } },
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
	const check = (level: "use" | "manage", agentKey: string = agent.key) =>
		checkAgentAccess(context, { userId: user.id, agentKey, level });

	expect(await check("use")).toMatchObject({ error: { status: 403 } });

	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values([
			{
				role_id: role.id,
				permission: getAgentPermission(agent.key, "use"),
				core: true,
			},
			{ role_id: role.id, permission: Permissions.MediaUpdate, core: true },
		])
		.execute();
	expect(await check("use")).toMatchObject({
		data: {
			agent: { key: agent.key },
			authority: {
				principal: { type: "user", userId: user.id },
				superAdmin: false,
				permissions: expect.arrayContaining([Permissions.MediaUpdate]),
			},
		},
	});
	expect(await check("manage")).toMatchObject({ error: { status: 403 } });
	expect(await check("use", "missing")).toMatchObject({
		error: { status: 403 },
	});

	await context.db.kysely
		.deleteFrom("lucid_role_permissions")
		.where("role_id", "=", role.id)
		.where("permission", "=", Permissions.MediaUpdate)
		.execute();
	expect((await check("use")).data?.authority.permissions).toEqual([
		getAgentPermission(agent.key, "use"),
	]);
	await context.db.kysely
		.deleteFrom("lucid_role_permissions")
		.where("role_id", "=", role.id)
		.execute();
	expect(await check("use")).toMatchObject({ error: { status: 403 } });

	//* code routines act as the system, which needs no role
	expect(
		await checkAgentAccess(context, {
			userId: null,
			agentKey: agent.key,
			level: "manage",
		}),
	).toMatchObject({
		data: { authority: { principal: { type: "system" }, superAdmin: true } },
	});

	await context.db.kysely
		.updateTable("lucid_users")
		.set({ super_admin: true })
		.where("id", "=", user.id)
		.execute();
	expect(await check("manage")).toMatchObject({
		data: { authority: { superAdmin: true } },
	});
	await context.db.kysely
		.updateTable("lucid_users")
		.set({ is_locked: true })
		.where("id", "=", user.id)
		.execute();
	expect(await check("use")).toMatchObject({ error: { status: 401 } });
});
