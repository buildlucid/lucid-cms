import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import z from "zod";
import defineAgent from "../../libs/agent/define-agent.js";
import type { ModelUsage } from "../../libs/agent/types.js";
import Migration00000014 from "../../libs/db/migrations/00000014-agent.js";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import defineAgentTool from "../../libs/tools/define-agent-tool.js";
import { executeAgentTool } from "../../libs/tools/execute-tool.js";
import type {
	AgentToolDefinition,
	AgentToolExecution,
} from "../../libs/tools/types.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import cancelRun from "./cancel-run.js";
import executeRun from "./execute-run.js";
import getConversations from "./get-conversations.js";
import getSubagents from "./get-subagents.js";
import advanceInputs from "./helpers/advance-inputs.js";
import enqueueRun from "./helpers/enqueue-run.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import insertConversation from "./helpers/insert-conversation.js";
import resolveRunSetup from "./helpers/resolve-run-setup.js";
import startRun from "./helpers/start-run.js";
import streamModelTurn from "./helpers/stream-model-turn.js";
import recoverRuns from "./recover-runs.js";
import submitInput from "./submit-input.js";
import { subagentMessageAgentTool } from "./tools/subagent-message/index.js";
import { subagentStartAgentTool } from "./tools/subagent-start/index.js";
import updateConversation from "./update-conversation.js";

vi.mock("./helpers/check-agent-access.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("./helpers/check-agent-access.js")>()),
	default: vi.fn(async (_context, input) => ({
		error: undefined,
		data: {
			agent: input.agentKey === helper.key ? helper : lead,
			authority: {
				principal:
					input.userId === null
						? { type: "system" }
						: { type: "user", userId: input.userId },
				permissions: ["agents:lead:chat", "agents:helper:chat"],
				superAdmin: input.userId === null,
			},
		},
	})),
}));
vi.mock("./helpers/stream-model-turn.js", () => ({ default: vi.fn() }));
vi.mock("./helpers/enqueue-run.js", () => ({
	default: vi.fn(async () => ({ error: undefined, data: undefined })),
}));
vi.mock("../connection/token-manager.js", () => ({
	default: async () => ({
		error: undefined,
		data: { accessToken: "test-token", lucidRemoteConnectionId: connectionId },
	}),
}));
vi.mock(
	"../../libs/lucid-remote/services/get-agent-models/index.js",
	async () => {
		const { mockAgentModels } =
			await import("../../utils/test-helpers/agent-models.js");
		return { default: mockAgentModels() };
	},
);

const features = {
	media: { analyze: false, readFile: false, generate: false },
	web: { search: false, read: false },
	memory: { read: false },
} as const;
const confirmedWrite = defineAgentTool({
	name: "test_write",
	description: "Writes something that needs confirming",
	input: z.object({}),
	output: z.object({ done: z.boolean() }),
	permissions: [],
	requiresConfirmation: true,
	handler: async () => ({ output: { done: true }, summary: "Wrote it." }),
});
const lead = defineAgent({
	key: "lead",
	name: "Lead",
	description: "Delegates work.",
	features,
});
const helper = defineAgent({
	key: "helper",
	name: "Helper",
	description: "Does the work.",
	features: { ...features, subagents: false },
	tools: [confirmedWrite],
});

const fixture = getTestConfig();
const model = vi.mocked(streamModelTurn);
const usage: ModelUsage = {
	model: "test-model",
	tokens: {
		input: {
			text: 1,
			image: 0,
			audio: 0,
			cached: { total: 0, text: 0, image: 0, audio: 0 },
			total: 1,
		},
		output: {
			text: 1,
			image: 0,
			audio: 0,
			reasoning: 0,
			acceptedPrediction: 0,
			rejectedPrediction: 0,
			total: 1,
		},
		total: 2,
	},
	cost: { creditsCharged: "1" },
};
let context: ServiceContext;
let userId: number;
let otherUserId: number;
let connectionId: number;

const start = () =>
	({
		type: "start",
		model: "test-model",
		inputTokenLimit: 128_000,
		toolLimit: 128,
	}) as const;
const reply = (text: string) =>
	model.mockImplementationOnce(async (_context, input) => {
		await input.emit(start());
		await input.emit({ type: "text-delta", text });
		return { error: undefined, data: { usage, connectionId } };
	});
const callTools = (
	...calls: { id: string; name: string; input: Record<string, unknown> }[]
) =>
	model.mockImplementationOnce(async (_context, input) => {
		await input.emit(start());
		for (const call of calls) await input.emit({ type: "tool-call", ...call });
		return { error: undefined, data: { usage, connectionId } };
	});
const startSubagent = {
	id: "start",
	name: "lucid_subagent_start",
	input: { agentKey: helper.key, task: "Find the pages that need work." },
};

/** A lead chat with a queued run acting for the test user. */
const startParent = async () => {
	const conversation = await insertConversation(context, {
		agentKey: lead.key,
		userId,
	});
	if (conversation.error) throw conversation.error;

	const run = await startRun(context, {
		conversationId: conversation.data.id,
		userId,
		runId: randomUUID(),
		text: "Improve the site.",
	});
	if (run.error) throw run.error;

	return { conversationId: conversation.data.id, runId: run.data.runId };
};
const subagentsOf = async (conversationId: string) => {
	const Conversations = new AgentConversationsRepository(context.db);
	const subagents = await Conversations.selectSubagents(conversationId);
	if (subagents.error) throw subagents.error;
	return subagents.data;
};
/** The chat's first sub-agent, with its latest run, which each test starts one of. */
const firstSubagent = async (conversationId: string) => {
	const [subagent] = await subagentsOf(conversationId);
	if (!subagent?.latest_run_id) throw new Error("No sub-agent was started.");
	return { ...subagent, runId: subagent.latest_run_id };
};
const runOf = async (runId: string) => {
	const Runs = new AgentRunsRepository(context.db);
	const run = await Runs.selectSingle({
		select: ["status", "waiting_for", "parent_notified_at", "checkpoint"],
		where: [{ key: "id", operator: "=", value: runId }],
	});
	return run.data;
};
const partsOf = async (conversationId: string) => {
	const Messages = new AgentMessagesRepository(context.db);
	const messages = await Messages.selectLatest({ conversationId, limit: 20 });
	return messages.data?.flatMap((message) => message.parts) ?? [];
};
const activeRunOf = async (conversationId: string) => {
	const Conversations = new AgentConversationsRepository(context.db);
	const conversation = await Conversations.selectSingle({
		select: ["active_run_id"],
		where: [{ key: "id", operator: "=", value: conversationId }],
	});
	return conversation.data?.active_run_id ?? null;
};

/** Calls a sub-agent tool as the parent run would, mid-slice. */
const callAsParent = async (
	parent: { conversationId: string; runId: string },
	tool: AgentToolDefinition,
	input: Record<string, unknown>,
	callId = "call",
) => {
	const execution: AgentToolExecution = {
		authority: {
			principal: { type: "user", userId },
			permissions: ["agents:lead:chat", "agents:helper:chat"],
			superAdmin: false,
		},
		actor: { type: "user", userId, agentRunId: parent.runId },
		signal: new AbortController().signal,
		operationId: `${parent.runId}:${callId}`,
		run: {
			id: parent.runId,
			conversationId: parent.conversationId,
			agentKey: lead.key,
		},
	};
	return executeAgentTool({ context, tool, input, execution });
};
const setRunStatus = (runId: string, status: "running" | "cancelled") =>
	context.db.kysely
		.updateTable("lucid_agent_runs")
		.set({ status })
		.where("id", "=", runId)
		.execute();

beforeAll(async () => {
	await fixture.migrate();
	const config = await fixture.getConfig();
	const database = await fixture.getDatabase();
	const tables = await database.client.introspection.getTables();
	if (!tables.some((table) => table.name === "lucid_agent_runs")) {
		await Migration00000014(config.db).up(database.client);
	}
	context = createServiceContext({
		config: {
			...config,
			ai: {
				...config.ai,
				agents: { enabled: true, definitions: [lead, helper] },
			},
		},
		database,
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	const users = await database.client
		.insertInto("lucid_users")
		.values([
			{
				email: "lead@example.test",
				username: "lead",
				secret: "test",
				super_admin: 1,
			},
			{
				email: "other@example.test",
				username: "other",
				secret: "test",
				super_admin: 0,
			},
		])
		.returning("id")
		.execute();
	userId = users[0]?.id ?? 0;
	otherUserId = users[1]?.id ?? 0;
	connectionId = (
		await database.client
			.insertInto("lucid_remote_connections")
			.values({ status: "connected" })
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
});
afterAll(() => fixture.destroy());
beforeEach(() => {
	model.mockReset();
	vi.mocked(enqueueRun).mockClear();
});

test("a parent waits for its sub-agent and carries on with the sub-agent's reply", async () => {
	const parent = await startParent();
	callTools(startSubagent, {
		id: "wait",
		name: "lucid_subagent_wait",
		input: {},
	});
	expect(await executeRun(context, { runId: parent.runId })).toMatchObject({
		data: { status: "waiting" },
	});
	expect(await runOf(parent.runId)).toMatchObject({ waiting_for: "subagents" });

	const subagent = await firstSubagent(parent.conversationId);
	expect(subagent).toMatchObject({
		agent_key: helper.key,
		user_id: userId,
		latest_run_status: "queued",
	});
	const childRunId = subagent.runId;
	expect((await runOf(childRunId))?.checkpoint?.mode).toBe("subagent");
	expect(await partsOf(subagent.id)).toContainEqual({
		type: "parent",
		agentKey: lead.key,
		conversationId: parent.conversationId,
	});

	reply("Found three pages.");
	expect(await executeRun(context, { runId: childRunId })).toMatchObject({
		data: { status: "completed" },
	});
	expect(enqueueRun).toHaveBeenCalledWith(expect.anything(), {
		runId: parent.runId,
		userId,
	});

	reply("All three are fixed.");
	expect(await executeRun(context, { runId: parent.runId })).toMatchObject({
		data: { status: "completed" },
	});
	expect(await partsOf(parent.conversationId)).toContainEqual(
		expect.objectContaining({
			type: "tool",
			name: "lucid_subagent_wait",
			status: "complete",
			output: {
				results: [
					expect.objectContaining({
						subagentId: subagent.id,
						status: "completed",
						reply: "Found three pages.",
					}),
				],
			},
		}),
	);
	//* the wait delivered the result, so the parent's last reply ended its run
	expect((await runOf(childRunId))?.parent_notified_at).not.toBeNull();
});

test("a parent that ends its reply while its sub-agent works waits for it in the same run", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	reply("I've started a helper.");
	expect(await executeRun(context, { runId: parent.runId })).toMatchObject({
		data: { status: "waiting" },
	});
	expect(await runOf(parent.runId)).toMatchObject({ waiting_for: "subagents" });

	const subagent = await firstSubagent(parent.conversationId);
	reply("Found three pages.");
	await executeRun(context, { runId: subagent.runId });
	expect(enqueueRun).toHaveBeenCalledWith(expect.anything(), {
		runId: parent.runId,
		userId,
	});

	reply("Your helper found three pages.");
	expect(await executeRun(context, { runId: parent.runId })).toMatchObject({
		data: { status: "completed" },
	});
	expect(await partsOf(parent.conversationId)).toContainEqual(
		expect.objectContaining({
			type: "tool",
			name: "lucid_subagent_wait",
			status: "complete",
			output: {
				results: [
					expect.objectContaining({
						subagentId: subagent.id,
						reply: "Found three pages.",
					}),
				],
			},
		}),
	);
});

test("a person's message during the wait gets an answer, then the parent waits again", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	reply("I've started a helper.");
	await executeRun(context, { runId: parent.runId });

	const sent = await submitInput(context, {
		conversationId: parent.conversationId,
		userId,
		inputId: randomUUID(),
		text: "Also check the blog.",
		delivery: { kind: "steer", targetRunId: parent.runId },
	});
	expect(sent.error).toBeUndefined();
	reply("I'll check the blog once the helper is done.");
	expect(await executeRun(context, { runId: parent.runId })).toMatchObject({
		data: { status: "waiting" },
	});
	expect(await partsOf(parent.conversationId)).toContainEqual({
		type: "text",
		text: "I'll check the blog once the helper is done.",
	});
	expect(await runOf(parent.runId)).toMatchObject({ waiting_for: "subagents" });
});

test("a parent run that fails stops the sub-agents it started", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	model.mockResolvedValueOnce({
		data: undefined,
		error: {
			type: "basic",
			status: 400,
			message: copy.literal("Bad request."),
		},
	});
	expect(await executeRun(context, { runId: parent.runId })).toMatchObject({
		data: { status: "failed" },
	});

	const subagent = await firstSubagent(parent.conversationId);
	expect(await runOf(subagent.runId)).toMatchObject({ status: "cancelled" });
});

test("people can only steer a sub-agent while it works", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	reply("Started.");
	await executeRun(context, { runId: parent.runId });
	const subagent = await firstSubagent(parent.conversationId);
	const subagentId = subagent.id;
	const runId = subagent.runId;

	const send = (delivery: Parameters<typeof submitInput>[1]["delivery"]) =>
		submitInput(context, {
			conversationId: subagentId,
			userId,
			inputId: randomUUID(),
			text: "Only check the blog.",
			delivery,
		});

	expect((await send({ kind: "queue" })).error?.status).toBe(409);
	//* it keeps the confirmation mode its parent gave it
	expect(
		(
			await updateConversation(context, {
				id: subagentId,
				userId,
				confirmationMode: "automatic",
			})
		).error?.status,
	).toBe(400);
	expect(
		(await send({ kind: "steer", targetRunId: runId })).error,
	).toBeUndefined();

	reply("Checked the blog.");
	await executeRun(context, { runId });
	expect(
		(await send({ kind: "steer", targetRunId: runId })).error?.status,
	).toBe(409);
});

test("a steer sent while a sub-agent writes its reply is answered before it finishes", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	reply("Started.");
	await executeRun(context, { runId: parent.runId });
	const subagent = await firstSubagent(parent.conversationId);

	model.mockImplementationOnce(async (_context, input) => {
		await input.emit(start());
		const sent = await submitInput(context, {
			conversationId: subagent.id,
			userId,
			inputId: randomUUID(),
			text: "Only check the blog.",
			delivery: { kind: "steer", targetRunId: subagent.runId },
		});
		if (sent.error) throw sent.error;
		await input.emit({ type: "text-delta", text: "Found three pages." });
		return { error: undefined, data: { usage, connectionId } };
	});
	reply("Checked the blog instead.");
	expect(await executeRun(context, { runId: subagent.runId })).toMatchObject({
		data: { status: "completed" },
	});
	expect(await partsOf(subagent.id)).toContainEqual({
		type: "text",
		text: "Checked the blog instead.",
	});
});

test("a sub-agent asks the person to confirm, and the parent chat can show it", async () => {
	const parent = await startParent();
	callTools(startSubagent, {
		id: "wait",
		name: "lucid_subagent_wait",
		input: {},
	});
	await executeRun(context, { runId: parent.runId });
	const subagent = await firstSubagent(parent.conversationId);

	callTools({ id: "write", name: "test_write", input: {} });
	expect(await executeRun(context, { runId: subagent.runId })).toMatchObject({
		data: { status: "waiting" },
	});

	const family = await getSubagents(context, {
		id: parent.conversationId,
		userId,
	});
	expect(family.data?.parent.latestRun?.waitingFor).toBe("subagents");
	expect(family.data?.subagents).toEqual([
		expect.objectContaining({
			id: subagent.id,
			parentConversationId: parent.conversationId,
			latestRun: expect.objectContaining({ waitingFor: "person" }),
			pending: expect.objectContaining({ key: "lucid-tool-confirmation" }),
		}),
	]);
});

test("sub-agents never ask questions, get a screen or start sub-agents of their own", async () => {
	const setup = resolveRunSetup(context, {
		agent: lead,
		authority: {
			principal: { type: "user", userId },
			permissions: ["agents:lead:chat"],
			superAdmin: false,
		},
		aiAccess: [],
		mode: "subagent",
		hasHistory: false,
		screen: {
			type: "document",
			tabId: "tab",
			collectionKey: "page",
			documentId: 1,
			requestId: null,
			label: "Home",
		},
	});
	const names = setup.definitions.map((tool) => tool.name);

	expect(names).not.toContain("lucid_ask_user");
	expect(names.filter((name) => name.startsWith("lucid_builder_"))).toEqual([]);
	expect(names.filter((name) => name.startsWith("lucid_subagent_"))).toEqual(
		[],
	);
});

test("stopping the parent stops its sub-agents without reporting them back", async () => {
	const parent = await startParent();
	callTools(startSubagent, {
		id: "wait",
		name: "lucid_subagent_wait",
		input: {},
	});
	await executeRun(context, { runId: parent.runId });
	const subagent = await firstSubagent(parent.conversationId);

	expect(
		(await cancelRun(context, { runId: parent.runId, userId })).error,
	).toBeUndefined();
	expect(await runOf(subagent.runId)).toMatchObject({
		status: "cancelled",
		parent_notified_at: expect.anything(),
	});
	expect(await activeRunOf(parent.conversationId)).toBeNull();
});

test("a retried start call returns the sub-agent it already started", async () => {
	const parent = await startParent();
	await setRunStatus(parent.runId, "running");
	const start = () =>
		callAsParent(parent, subagentStartAgentTool({}), startSubagent.input);

	const first = await start();
	const second = await start();
	expect(first).toMatchObject({ type: "success" });
	expect(second).toEqual(first);
	expect(await subagentsOf(parent.conversationId)).toHaveLength(1);
});

test("a sub-agent is never started for a run that has been stopped", async () => {
	const parent = await startParent();
	await setRunStatus(parent.runId, "cancelled");

	expect(
		await callAsParent(parent, subagentStartAgentTool({}), startSubagent.input),
	).toMatchObject({ type: "failed" });
	expect(await subagentsOf(parent.conversationId)).toEqual([]);
});

test("a parent only steers a sub-agent run acting for the same person, and a retry sends once", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	reply("Started.");
	await executeRun(context, { runId: parent.runId });
	const subagent = await firstSubagent(parent.conversationId);
	const childRunId = subagent.runId;
	await setRunStatus(parent.runId, "running");
	const message = (callId: string) =>
		callAsParent(
			parent,
			subagentMessageAgentTool(),
			{ subagentId: subagent.id, message: "Only the blog." },
			callId,
		);

	expect(await message("steer")).toMatchObject({
		data: { output: { delivery: "steer" } },
	});
	expect(await message("steer")).toMatchObject({
		data: { output: { delivery: "steer" } },
	});

	//* the sub-agent's run acting for someone else gets the message once it ends
	await context.db.kysely
		.updateTable("lucid_agent_runs")
		.set({ user_id: otherUserId })
		.where("id", "=", childRunId)
		.execute();
	expect(await message("queued")).toMatchObject({
		data: { output: { delivery: "queued" } },
	});
	const Inputs = new AgentInputsRepository(context.db);
	const sent = await Inputs.selectDeliverable(subagent.id);
	expect(
		sent.data?.map((input) => [input.source, input.target_run_id]),
	).toEqual([
		["parent", childRunId],
		["parent", null],
	]);
});

test("a parent recovered mid-wait still waits on its sub-agents", async () => {
	const parent = await startParent();
	callTools(startSubagent, {
		id: "wait",
		name: "lucid_subagent_wait",
		input: {},
	});
	await executeRun(context, { runId: parent.runId });
	//* as if the worker crashed after saving the wait
	await context.db.kysely
		.updateTable("lucid_agent_runs")
		.set({ status: "interrupted", waiting_for: null })
		.where("id", "=", parent.runId)
		.execute();

	await recoverRuns(context);
	expect(await runOf(parent.runId)).toMatchObject({
		status: "waiting",
		waiting_for: "subagents",
	});
});

test("stopping a sub-agent drops its parent's undelivered messages, so it stays stopped", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	reply("Started.");
	await executeRun(context, { runId: parent.runId });
	const subagent = await firstSubagent(parent.conversationId);
	await setRunStatus(parent.runId, "running");
	await callAsParent(
		parent,
		subagentMessageAgentTool(),
		{ subagentId: subagent.id, message: "Only the blog." },
		"steer",
	);

	await cancelRun(context, { runId: subagent.runId, userId });
	const Inputs = new AgentInputsRepository(context.db);
	expect((await Inputs.selectDeliverable(subagent.id)).data).toEqual([]);
	expect(await advanceInputs(context, { conversationId: subagent.id })).toEqual(
		{ error: undefined, data: { runId: null } },
	);
});

test("a stale stop for a finished run leaves the chat's sub-agents working", async () => {
	const parent = await startParent();
	reply("Hello.");
	await executeRun(context, { runId: parent.runId });
	const next = await startRun(context, {
		conversationId: parent.conversationId,
		userId,
		runId: randomUUID(),
		text: "Now improve the blog.",
	});
	if (next.error) throw next.error;
	callTools(startSubagent);
	reply("Started.");
	await executeRun(context, { runId: next.data.runId });
	const subagent = await firstSubagent(parent.conversationId);

	expect(
		(await cancelRun(context, { runId: parent.runId, userId })).error,
	).toBeUndefined();
	expect(await runOf(subagent.runId)).toMatchObject({
		status: "queued",
	});
});

test("sub-agent chats stay out of chat lists and open for whoever can open their parent", async () => {
	const parent = await startParent();
	callTools(startSubagent);
	reply("Started.");
	await executeRun(context, { runId: parent.runId });
	const subagent = await firstSubagent(parent.conversationId);
	const subagentId = subagent.id;

	const listed = await getConversations(context, {
		userId,
		query: { perPage: 100 },
	});
	const ids = listed.data?.data.map((conversation) => conversation.id);
	expect(ids).toContain(parent.conversationId);
	expect(ids).not.toContain(subagentId);

	expect(
		(await getAccessibleConversation(context, { id: subagentId, userId }))
			.error,
	).toBeUndefined();
	expect(
		(
			await getAccessibleConversation(context, {
				id: subagentId,
				userId: otherUserId,
			})
		).error?.status,
	).toBe(404);
});
