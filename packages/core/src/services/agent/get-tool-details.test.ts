import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import defineAgent from "../../libs/agent/define-agent.js";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import {
	AgentMessagesRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import type { AgentToolDetails } from "../../types/response.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import getMessages from "./get-messages.js";
import getToolDetails from "./get-tool-details.js";
import insertConversation from "./helpers/insert-conversation.js";

const fixture = getTestConfig();
const agent = defineAgent({
	key: "tool-details",
	name: "Tool details",
	description: "Tests saved calls.",
});
let context: ServiceContext;
let userId: number;
let otherId: number;
let conversationId: string;
let otherConversationId: string;
const messageId = randomUUID();
const tool: AgentToolDetails = {
	type: "tool",
	id: "read/1",
	name: "documents_get",
	status: "complete",
	summary: copy("admin:test.document.read", {
		data: { title: "Accessibility notes", documentId: 12 },
		defaultMessage: "Read {{title}}.",
	}),
	title: { type: "lucid.literal", value: "Read document" },
	input: { documentId: 12, instructions: "i".repeat(8192) },
	output: { content: "o".repeat(32_768) },
};

beforeAll(async () => {
	await fixture.migrate();
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: { ...config.ai, agents: { definitions: [agent] } },
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	const createUser = async () => {
		const Users = new UsersRepository(context.db);
		const result = await Users.createSingle({
			data: {
				email: `${randomUUID()}@example.test`,
				username: randomUUID(),
				secret: "fixture",
				super_admin: true,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		assert(result.data, JSON.stringify(result.error));
		return result.data.id;
	};
	userId = await createUser();
	otherId = await createUser();
	for (const other of [false, true]) {
		const chat = await insertConversation(context, {
			agentKey: agent.key,
			userId,
		});
		assert(chat.data, JSON.stringify(chat.error));
		if (other) otherConversationId = chat.data.id;
		else {
			conversationId = chat.data.id;
		}
	}
	const AgentMessages = new AgentMessagesRepository(context.db);
	const saved = await AgentMessages.createSingle({
		data: {
			id: messageId,
			conversation_id: conversationId,
			run_id: null,
			position: 1,
			role: "assistant",
			parts: [tool],
		},
		validation: { enabled: true },
	});
	expect(saved.error).toBeUndefined();
});
afterAll(() => fixture.destroy());

const read = (overrides: Partial<Parameters<typeof getToolDetails>[1]> = {}) =>
	getToolDetails(context, {
		conversationId,
		messageId,
		toolCallId: tool.id,
		userId,
		...overrides,
	});

test("history sends a summary and the detail endpoint returns the unchanged saved call", async () => {
	const history = await getMessages(context, {
		conversationId,
		userId,
		limit: 50,
	});
	expect(history.error).toBeUndefined();
	expect(history.data?.[0]?.parts).toEqual([
		{
			type: "tool",
			id: tool.id,
			name: tool.name,
			title: tool.title,
			summary: tool.summary,
			status: "complete",
			detailsAvailable: true,
		},
	]);
	expect(JSON.stringify(history.data).length).toBeLessThan(1000);
	expect(await read()).toEqual({ error: undefined, data: tool });
});

test("calls cannot be read through another user, conversation, message or call ID", async () => {
	for (const overrides of [
		{ userId: otherId },
		{ conversationId: otherConversationId },
		{ messageId: randomUUID() },
		{ toolCallId: "missing" },
	]) {
		expect(await read(overrides)).toMatchObject({ error: { status: 404 } });
	}
});

test("saved calls require the owner's current agent permission", async () => {
	const users = new UsersRepository(context.db);
	const changed = await users.updateSingle({
		data: { super_admin: false },
		where: [{ key: "id", operator: "=", value: userId }],
	});
	expect(changed.error).toBeUndefined();
	expect(await read()).toMatchObject({ error: { status: 403 } });
});
