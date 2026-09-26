import { afterAll, expect, test } from "vitest";
import defineAgent from "../../libs/agent/define-agent.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { getAgentPermission } from "../../libs/permission/agent-permissions.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import getConversation from "./get-conversation.js";
import getConversations from "./get-conversations.js";
import insertConversation from "./helpers/insert-conversation.js";

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

const agent = (key: string) =>
	defineAgent({ key, name: key, description: key, tools: [] });

test("chats are private, and code routine chats are shared with the agent's managers", async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	const context = createServiceContext({
		config: {
			...config,
			ai: { ...config.ai, agents: [agent("seo"), agent("copy")] },
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	const createUser = async (username: string, permissions: string[]) => {
		const user = await context.db.kysely
			.insertInto("lucid_users")
			.values({ email: `${username}@test.local`, username, secret: "test" })
			.returning("id")
			.executeTakeFirstOrThrow();
		const role = await context.db.kysely
			.insertInto("lucid_roles")
			.values({ name: username, description: null, key: null, locked: false })
			.returning("id")
			.executeTakeFirstOrThrow();
		await context.db.kysely
			.insertInto("lucid_user_roles")
			.values({ user_id: user.id, role_id: role.id })
			.execute();
		await context.db.kysely
			.insertInto("lucid_role_permissions")
			.values(
				permissions.map((permission) => ({
					role_id: role.id,
					permission,
					core: true,
				})),
			)
			.execute();
		return user.id;
	};
	const editor = await createUser("editor", [
		getAgentPermission("seo", "use"),
		getAgentPermission("copy", "use"),
	]);
	const manager = await createUser("manager", [
		getAgentPermission("seo", "manage"),
	]);

	const chat = async (agentKey: string, userId: number | null) => {
		const created = await insertConversation(context, { agentKey, userId });
		if (created.error) throw new Error(JSON.stringify(created.error));
		return created.data.id;
	};
	const own = await chat("seo", editor);
	const ownCopy = await chat("copy", editor);
	const managersOnly = await chat("seo", null);
	const otherAgent = await chat("copy", null);
	const listed = async (userId: number) =>
		(
			await getConversations(context, {
				userId,
				query: { page: 1, perPage: 10 },
			})
		).data?.data
			.map((conversation) => conversation.id)
			.sort();

	expect(await listed(editor)).toEqual([own, ownCopy].sort());
	expect(await listed(manager)).toEqual([managersOnly]);

	expect(
		(await getConversation(context, { id: managersOnly, userId: manager })).data
			?.userId,
	).toBeNull();
	for (const [id, userId] of [
		[own, manager],
		[managersOnly, editor],
		[otherAgent, manager],
	] as const) {
		expect(
			(await getConversation(context, { id, userId })).error?.status,
		).toBeGreaterThanOrEqual(403);
	}
});
