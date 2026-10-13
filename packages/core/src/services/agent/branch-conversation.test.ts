import { afterAll, beforeAll, expect, test } from "vitest";
import defineAgent from "../../libs/agent/define-agent.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { getAgentPermission } from "../../libs/permission/agent-permissions.js";
import {
	AgentCompactionsRepository,
	AgentMessagesRepository,
} from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import branchConversation from "./branch-conversation.js";
import getConversation from "./get-conversation.js";
import insertConversation from "./helpers/insert-conversation.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: {
				...config.ai,
				agents: {
					enabled: true,
					definitions: [
						defineAgent({
							key: "seo",
							name: "seo",
							description: "seo",
							tools: [],
						}),
					],
				},
			},
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
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

test("branches copy a routine chat up to a finished reply into the requester's own chat", async () => {
	const manager = await createUser("manager", [
		getAgentPermission("seo", "chat"),
		getAgentPermission("seo", "manage-code-routines"),
	]);
	const editor = await createUser("editor", [
		getAgentPermission("seo", "chat"),
	]);

	const source = await insertConversation(context, {
		agentKey: "seo",
		userId: null,
		title: "Weekly audit",
	});
	if (source.error) throw new Error(JSON.stringify(source.error));
	const conversationId = source.data.id;

	const finishedRun = crypto.randomUUID();
	const activeRun = crypto.randomUUID();
	await context.db.kysely
		.insertInto("lucid_agent_runs")
		.values([
			{ id: finishedRun, conversation_id: conversationId, status: "completed" },
			{ id: activeRun, conversation_id: conversationId, status: "running" },
		])
		.execute();
	await context.db.kysely
		.updateTable("lucid_agent_conversations")
		.set({ active_run_id: activeRun })
		.where("id", "=", conversationId)
		.execute();

	const now = new Date().toISOString();
	const message = (
		position: number,
		runId: string,
		role: "user" | "assistant",
	) => ({
		id: crypto.randomUUID(),
		conversation_id: conversationId,
		run_id: runId,
		position,
		role,
		created_at: now,
		updated_at: now,
	});
	const finishedReply = {
		...message(2, finishedRun, "assistant"),
		parts: [
			{
				type: "tool" as const,
				id: "call-1",
				name: "documents_get",
				summary: { type: "lucid.literal" as const, value: "Read a page" },
				input: {},
				status: "running" as const,
			},
			{
				type: "widget" as const,
				key: "confirm",
				version: 1,
				data: {},
				interaction: {
					id: "interaction-1",
					toolCallId: "call-1",
					title: { type: "lucid.literal" as const, value: "Continue?" },
					placement: "inline" as const,
					status: "pending" as const,
				},
			},
		],
	};
	const activeReply = {
		...message(4, activeRun, "assistant"),
		parts: [{ type: "text" as const, text: "Working on it" }],
	};

	const AgentMessages = new AgentMessagesRepository(context.db);
	const AgentCompactions = new AgentCompactionsRepository(context.db);

	const inserted = await AgentMessages.createMultiple({
		data: [
			{
				...message(1, finishedRun, "user"),
				parts: [{ type: "text", text: "Audit the site." }],
			},
			finishedReply,
			{
				...message(3, activeRun, "user"),
				parts: [{ type: "text", text: "And the blog?" }],
			},
			activeReply,
		],
	});
	if (inserted.error) throw new Error(JSON.stringify(inserted.error));
	const compacted = await AgentCompactions.createMultiple({
		data: [1, 3].map((position) => ({
			id: crypto.randomUUID(),
			conversation_id: conversationId,
			through_position: position,
			summary: `Through ${position}`,
			created_at: now,
		})),
	});
	if (compacted.error) throw new Error(JSON.stringify(compacted.error));

	const branched = await branchConversation(context, {
		conversationId,
		messageId: finishedReply.id,
		userId: manager,
	});
	if (branched.error) throw new Error(JSON.stringify(branched.error));
	expect(branched.data).toMatchObject({
		userId: manager,
		kind: "chat",
		routineId: null,
		title: "Weekly audit",
	});

	const messages = await AgentMessages.selectAfter({
		conversationId: branched.data.id,
		after: 0,
		limit: 10,
	});
	expect(
		messages.data?.map((saved) => ({
			position: saved.position,
			runId: saved.run_id,
			parts: saved.parts,
		})),
	).toEqual([
		{
			position: 1,
			runId: null,
			parts: [{ type: "text", text: "Audit the site." }],
		},
		{
			position: 2,
			runId: null,
			parts: [
				{ ...finishedReply.parts[0], status: "skipped" },
				{
					...finishedReply.parts[1],
					interaction: {
						...finishedReply.parts[1]?.interaction,
						status: "cancelled",
					},
				},
			],
		},
	]);

	const summaries = await AgentCompactions.selectLatest(branched.data.id);
	expect(summaries.data?.summary).toBe("Through 1");

	expect(
		(await AgentMessages.selectAfter({ conversationId, after: 0, limit: 10 }))
			.data,
	).toHaveLength(4);
	expect(
		(await getConversation(context, { id: branched.data.id, userId: editor }))
			.error?.status,
	).toBe(404);

	const unfinished = await branchConversation(context, {
		conversationId,
		messageId: activeReply.id,
		userId: manager,
	});
	expect(unfinished.error?.status).toBe(409);

	const hidden = await branchConversation(context, {
		conversationId,
		messageId: finishedReply.id,
		userId: editor,
	});
	expect(hidden.error?.status).toBeGreaterThanOrEqual(403);
});
