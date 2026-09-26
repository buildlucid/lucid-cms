import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import z from "zod";
import defineAgent from "../../libs/agent/define-agent.js";
import type { Checkpoint, ModelUsage } from "../../libs/agent/types.js";
import Migration00000014 from "../../libs/db/migrations/00000014-agent.js";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import {
	AgentInputsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
	AiGenerationsRepository,
} from "../../libs/repositories/index.js";
import defineTool from "../../libs/tools/define-tool.js";
import type { AgentStreamEvent } from "../../types/response.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import advanceInputs from "./advance-inputs.js";
import cancelRun from "./cancel-run.js";
import createRoutine from "./create-routine.js";
import executeRun from "./execute-run.js";
import getConversation from "./get-conversation.js";
import getInputs from "./get-inputs.js";
import enqueueRun from "./helpers/enqueue-run.js";
import insertConversation from "./helpers/insert-conversation.js";
import streamModelTurn from "./helpers/stream-model-turn.js";
import sumCredits from "./helpers/sum-credits.js";
import recoverInputs from "./recover-inputs.js";
import startRun from "./start-run.js";
import submitInput from "./submit-input.js";
import updateInput from "./update-input.js";
import watchRun from "./watch-run.js";

const remoteRequest = vi.fn();
vi.mock("./helpers/check-agent-access.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("./helpers/check-agent-access.js")>()),
	default: vi.fn(async (_context, input) => ({
		error: undefined,
		data: {
			agent: testAgent,
			authority: {
				principal:
					input.userId === null
						? { type: "system" }
						: { type: "user", userId: input.userId },
				permissions: [],
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
vi.mock("../../libs/lucid-remote/client.js", () => ({
	getLucidRemoteClient: () => ({ request: remoteRequest }),
}));

const testConfig = getTestConfig();
let context: ServiceContext;
let userId: number;
let connectionId: number;
const writeHandler = vi.fn(async () => ({
	error: undefined,
	data: { output: { done: true } },
}));
const writeTool = defineTool({
	target: "agent",
	name: "test_write",
	description: "Test write",
	input: z.object({ content: z.string().optional() }),
	output: z.object({ done: z.boolean() }),
	permissions: [],
	handler: writeHandler,
});
const readHandler = vi.fn(async () => ({
	error: undefined,
	data: { output: { done: true } },
}));
const readTool = defineTool({
	target: "agent",
	name: "test_read",
	description: "Test read",
	input: z.object({}),
	output: z.object({ done: z.boolean() }),
	permissions: [],
	readOnly: true,
	handler: readHandler,
});
const testAgent = defineAgent({
	key: "test",
	name: "Test Agent",
	description: "Runs tests.",
	tools: [writeTool, readTool],
});
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
	cost: { creditsCharged: "0.0001" },
};
const model = vi.mocked(streamModelTurn);

//* the input limit the mocked API reports; compaction tests lower it to reach their thresholds
let inputTokenLimit = 128_000;
const start = () =>
	({ type: "start", model: "test-model", inputTokenLimit }) as const;

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	const database = await testConfig.getDatabase();
	const tables = await database.client.introspection.getTables();
	if (!tables.some((table) => table.name === "lucid_agent_runs")) {
		await Migration00000014(config.db).up(database.client);
	}
	context = createServiceContext({
		config: {
			...config,
			ai: { ...config.ai, agents: [testAgent] },
		},
		database,
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	userId = (
		await database.client
			.insertInto("lucid_users")
			.values({
				email: "runner@example.test",
				username: "runner",
				secret: "test",
			})
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
	connectionId = (
		await database.client
			.insertInto("lucid_remote_connections")
			.values({ status: "connected" })
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
});
afterAll(() => testConfig.destroy());
afterEach(() => vi.restoreAllMocks());
beforeEach(() => {
	inputTokenLimit = 128_000;
	model.mockReset();
	remoteRequest.mockReset();
	writeHandler.mockClear();
	readHandler.mockClear();
	vi.mocked(enqueueRun).mockClear();
});

const prepare = async (props?: { routineId?: string }) => {
	const conversation = await insertConversation(context, {
		agentKey: testAgent.key,
		userId,
		routineId: props?.routineId,
	});
	if (conversation.error) throw new Error(JSON.stringify(conversation.error));
	const requestId = randomUUID();
	const run = await startRun(context, {
		userId,
		conversationId: conversation.data.id,
		text: "Hello",
		requestId,
		routineId: props?.routineId,
	});
	if (run.error) throw run.error;
	return {
		runId: run.data.runId,
		conversationId: conversation.data.id,
		requestId,
	};
};
const reply = (text: string) =>
	model.mockImplementationOnce(async (_ctx, input) => {
		await input.emit(start());
		await input.emit({ type: "text-delta", text });
		return { error: undefined, data: { usage, connectionId } };
	});
const callTool = (call: {
	id: string;
	name: string;
	input: Record<string, unknown>;
}) =>
	model.mockImplementationOnce(async (_ctx, input) => {
		await input.emit(start());
		await input.emit({ type: "tool-call", ...call });
		return { error: undefined, data: { usage, connectionId } };
	});
const partsOf = async (conversationId: string) => {
	const Messages = new AgentMessagesRepository(context.db);
	const result = await Messages.selectLatest({ conversationId, limit: 20 });
	return result.data?.flatMap((message) => message.parts);
};
const selectRun = async (runId: string) => {
	const Runs = new AgentRunsRepository(context.db);
	const result = await Runs.selectSingle({
		select: ["status", "outcome", "summary", "checkpoint"],
		where: [{ key: "id", operator: "=", value: runId }],
	});
	return result.data;
};

describe("agent runner", () => {
	test("streams text, persists it and bills one call across a repeated submission", async () => {
		const prepared = await prepare();
		reply("Done.");
		const events: AgentStreamEvent[] = [];
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				emit: async (event) => {
					events.push(event);
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(events).toContainEqual(
			expect.objectContaining({ type: "text-delta", text: "Done." }),
		);
		expect(model.mock.calls[0]?.[1].tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining([
				"collections_list",
				"collections_describe",
				"documents_find",
				"documents_get",
				"test_read",
			]),
		);

		const replay = await startRun(context, {
			userId,
			conversationId: prepared.conversationId,
			text: "Hello",
			requestId: prepared.requestId,
		});
		expect(replay.error).toBeUndefined();
		await executeRun(context, { runId: prepared.runId });
		expect(model).toHaveBeenCalledTimes(1);
		expect(await partsOf(prepared.conversationId)).toContainEqual({
			type: "text",
			text: "Done.",
		});
		const AiGenerations = new AiGenerationsRepository(context.db);
		const costs = await AiGenerations.agentUsageByRuns([prepared.runId]);
		expect(costs.data).toMatchObject([
			{ model_calls: 1, credits_charged: "0.0001" },
		]);
	});

	test("pauses for a question and continues with the answer", async () => {
		const prepared = await prepare();
		callTool({
			id: "q1",
			name: "lucid_ask_user",
			input: { question: "Which colour?", options: ["Blue", "Red"] },
		});
		const events: AgentStreamEvent[] = [];
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				emit: async (event) => {
					events.push(event);
				},
			}),
		).toMatchObject({ data: { status: "waiting" } });
		expect(events).toContainEqual(
			expect.objectContaining({ type: "question", id: "q1", kind: "question" }),
		);
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({ type: "question", id: "q1" }),
		);
		expect(
			(await executeRun(context, { runId: prepared.runId })).error?.status,
		).toBe(409);

		reply("Blue it is.");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: { questionId: "q1", answer: "Blue", userId },
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(model.mock.calls[1]?.[1].messages).toContainEqual({
			role: "tool",
			toolCallId: "q1",
			name: "lucid_ask_user",
			output: { answer: "Blue" },
		});
	});

	test("requires approval before a write and does not repeat it on replay", async () => {
		const prepared = await prepare();
		const input = { content: `${"a".repeat(16_000)} end of approved input` };
		callTool({ id: "w1", name: "test_write", input });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({
				type: "question",
				id: "w1",
				kind: "approval",
				question: expect.stringContaining(JSON.stringify(input)),
			}),
		);
		expect(writeHandler).not.toHaveBeenCalled();
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: { questionId: "w1", answer: "Sure", userId },
			}),
		).toMatchObject({ error: { status: 400 } });

		reply("Written.");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: { questionId: "w1", answer: "approve", userId },
			}),
		).toMatchObject({ data: { status: "completed" } });
		await executeRun(context, { runId: prepared.runId });
		expect(writeHandler).toHaveBeenCalledTimes(1);
		expect(writeHandler).toHaveBeenCalledWith(
			expect.objectContaining({ input }),
		);
	});

	test("starting another run leaves active and interrupted runs intact", async () => {
		const prepared = await prepare();
		const next = {
			userId,
			conversationId: prepared.conversationId,
			text: "Try something else",
			requestId: randomUUID(),
		};
		expect(await startRun(context, next)).toMatchObject({
			error: { status: 409 },
		});
		model.mockImplementationOnce(async () => ({
			data: undefined,
			error: { type: "basic", status: 502 },
		}));
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "interrupted" },
		});
		expect(await startRun(context, next)).toMatchObject({
			error: { status: 409 },
		});
		expect((await selectRun(prepared.runId))?.status).toBe("interrupted");
	});

	test("hands a disconnected run to the queue and asks the model again", async () => {
		const prepared = await prepare();
		const disconnect = new AbortController();
		model.mockImplementationOnce(async (_ctx, input) => {
			await input.emit({ type: "text-delta", text: "Part" });
			disconnect.abort();
			return { data: undefined, error: { type: "basic", status: 502 } };
		});
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				signal: disconnect.signal,
			}),
		).toMatchObject({ data: { status: "queued" } });
		expect(enqueueRun).toHaveBeenCalledWith(expect.anything(), {
			runId: prepared.runId,
			userId,
		});

		reply("Whole answer.");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(model.mock.calls[1]?.[1].requestId).not.toBe(
			model.mock.calls[0]?.[1].requestId,
		);
	});

	test("keeps a routine working until it finishes with a summary", async () => {
		const routine = await createRoutine(context, {
			agentKey: testAgent.key,
			userId,
			name: "Weekly check",
			instructions: "Check things.",
			cron: "0 9 * * 1",
			timezone: "UTC",
			enabled: false,
		});
		if (routine.error) throw routine.error;
		const prepared = await prepare({ routineId: routine.data.id });
		reply("Looking into it.");
		callTool({
			id: "f1",
			name: "lucid_finish_run",
			input: { outcome: "done", summary: "Everything checked." },
		});
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(model).toHaveBeenCalledTimes(2);
		expect(model.mock.calls[1]?.[1].messages).toContainEqual(
			expect.objectContaining({
				role: "user",
				content: expect.stringContaining("lucid_finish_run"),
			}),
		);
		expect(await selectRun(prepared.runId)).toMatchObject({
			outcome: "done",
			summary: "Everything checked.",
		});
	});

	test("a routine that exhausts its nudges needs review instead of claiming success", async () => {
		const routine = await createRoutine(context, {
			agentKey: testAgent.key,
			userId,
			name: "Unfinished check",
			instructions: "Check things.",
			cron: "0 9 * * 1",
			timezone: "UTC",
			enabled: false,
		});
		if (routine.error) throw routine.error;

		const prepared = await prepare({ routineId: routine.data.id });
		reply("Starting.");
		reply("Still looking.");
		reply("I have not completed the check.");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(model).toHaveBeenCalledTimes(3);
		expect(await selectRun(prepared.runId)).toMatchObject({
			outcome: "needs_review",
			summary: "I have not completed the check.",
		});
	});

	test.each([
		{
			remoteStatus: "failed",
			remoteUsage: undefined,
			expectedRunStatus: "failed",
			expectedUsageStatus: "failed",
		},
		{
			remoteStatus: "processing",
			remoteUsage: usage,
			expectedRunStatus: "interrupted",
			expectedUsageStatus: "success",
		},
		{
			remoteStatus: "processing",
			remoteUsage: undefined,
			expectedRunStatus: "interrupted",
			expectedUsageStatus: "pending",
		},
	])("settles a model failure reported remotely as $remoteStatus with usage $expectedUsageStatus", async ({
		remoteStatus,
		remoteUsage,
		expectedRunStatus,
		expectedUsageStatus,
	}) => {
		const prepared = await prepare();
		const queuedId = randomUUID();
		await submitInput(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: queuedId,
			text: "Wait for this run",
			delivery: { kind: "queue" },
		});
		model.mockImplementationOnce(async (_context, input) => {
			await input.onRequest?.(connectionId);
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 502,
					key: "agent_model_failed",
					message: copy.literal("Provider failed"),
				},
			};
		});
		remoteRequest.mockImplementation(async (path: string) => ({
			error: undefined,
			data: {
				json: {
					data: {
						requestId: path.split("/").at(-1),
						status: remoteStatus,
						...(remoteUsage ? { usage: remoteUsage } : {}),
					},
				},
			},
		}));
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: expectedRunStatus },
		});
		expect(await selectRun(queuedId)).toBeUndefined();
		expect(
			(await getConversation(context, { id: prepared.conversationId, userId }))
				.data?.queuePaused,
		).toBe(expectedRunStatus === "failed");
		const AiGenerations = new AiGenerationsRepository(context.db);
		const record = await AiGenerations.selectSingleByRequestId({
			requestId: model.mock.calls[0]?.[1].requestId ?? "",
			select: ["status", "credits_charged"],
		});
		expect(record.data?.status).toBe(expectedUsageStatus);
		expect(record.data?.credits_charged).toBe(remoteUsage ? "0.0001" : null);
	});

	test("watching a run sends its saved reply, then finishes", async () => {
		const prepared = await prepare();
		reply("Background reply.");
		await executeRun(context, { runId: prepared.runId });

		const events: AgentStreamEvent[] = [];
		const watched = await watchRun(context, {
			runId: prepared.runId,
			signal: new AbortController().signal,
			emit: async (event) => {
				events.push(event);
			},
		});
		expect(watched.error).toBeUndefined();
		expect(events).toEqual([
			{
				type: "message",
				message: expect.objectContaining({
					role: "user",
					parts: [{ type: "text", text: "Hello" }],
				}),
			},
			{
				type: "message",
				message: expect.objectContaining({
					role: "assistant",
					parts: [{ type: "text", text: "Background reply." }],
				}),
			},
			{
				type: "context",
				runId: prepared.runId,
				context: expect.objectContaining({ status: "ready" }),
			},
			{ type: "inputs", inputs: [], queuePaused: false },
			{ type: "finish", runId: prepared.runId, status: "completed" },
		]);
	});

	test("adds decimal credits without floating point rounding", () => {
		expect(sumCredits("0.1", "0.2")).toBe("0.3");
		expect(sumCredits("999999999999999999", "0.000001", 3)).toBe(
			"999999999999999999.000003",
		);
	});
});

describe("conversation compaction", () => {
	//* longer than the tail kept verbatim at this limit, so there is always something to summarise
	const longReply = `Draft saved. No publishing was requested. ${"Detail. ".repeat(300)}`;
	const summaryOf = (checkpoint?: Checkpoint | null) =>
		JSON.stringify(checkpoint?.messages[0]).includes(
			"Earlier conversation summary",
		);
	const compactAfterReply = async () => {
		const prepared = await prepare();
		reply(longReply);
		await executeRun(context, { runId: prepared.runId });
		const requestId = randomUUID();
		const compact = await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId,
			purpose: "compact",
		});
		expect(compact.error).toBeUndefined();
		return { ...prepared, compactId: requestId };
	};
	beforeEach(() => {
		inputTokenLimit = 4_000;
	});

	test("manual compaction keeps history and continues from only the newest summary", async () => {
		const prepared = await compactAfterReply();
		reply(
			"Current goal: draft content. Constraint: never publish without approval.",
		);
		const events: AgentStreamEvent[] = [];
		expect(
			await executeRun(context, {
				runId: prepared.compactId,
				emit: async (event) => {
					events.push(event);
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		const [chat, compaction] = model.mock.calls.map(([, input]) => input);
		//* the summary request repeats the chat's prefix, so the prompt cache applies
		expect(compaction).toMatchObject({
			purpose: "compact",
			instructions: chat?.instructions,
			tools: chat?.tools,
		});
		expect(compaction?.messages.slice(0, chat?.messages.length)).toEqual(
			chat?.messages,
		);
		expect(
			events.some(
				(event) =>
					event.type === "context" && event.context.status === "compacting",
			),
		).toBe(true);
		const records = await context.db.kysely
			.selectFrom("lucid_agent_compactions")
			.selectAll()
			.where("conversation_id", "=", prepared.conversationId)
			.execute();
		expect(records).toHaveLength(1);
		expect(await partsOf(prepared.conversationId)).toHaveLength(2);

		const next = randomUUID();
		await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: next,
			text: "Continue in French",
		});
		reply(`Continuing with the French draft. ${"Détail. ".repeat(300)}`);
		await executeRun(context, { runId: next });
		const continued = model.mock.calls[2]?.[1];
		expect(continued?.messages[0]).toMatchObject({
			content: expect.stringContaining("never publish without approval"),
		});
		expect(continued?.messages).not.toContainEqual({
			role: "user",
			content: "Hello",
		});
		expect(continued?.messages.at(-1)).toEqual({
			role: "user",
			content: "Continue in French",
		});
		//* history is only offered once context has been summarised
		const toolNames = (index: number) =>
			model.mock.calls[index]?.[1].tools.map((tool) => tool.name);
		expect(toolNames(0)).not.toContain("lucid_read_history");
		expect(toolNames(2)).toContain("lucid_read_history");
		const charged = await context.db.kysely
			.selectFrom("lucid_ai_generations")
			.select(["feature_key"])
			.where("agent_run_id", "=", prepared.compactId)
			.execute();
		expect(charged).toEqual([{ feature_key: "agent.compact" }]);

		const second = randomUUID();
		await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: second,
			purpose: "compact",
		});
		reply("Updated goal: continue drafting in French, without publishing.");
		await executeRun(context, { runId: second });
		expect(model.mock.calls[3]?.[1].messages[0]).toMatchObject({
			content: expect.stringContaining("never publish without approval"),
		});
		const afterSecond = randomUUID();
		await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: afterSecond,
			text: "Carry on",
		});
		reply("Ready.");
		await executeRun(context, { runId: afterSecond });
		const latestContext = model.mock.calls[4]?.[1].messages;
		expect(latestContext?.[0]).toMatchObject({
			content: expect.stringContaining("Updated goal:"),
		});
		expect(JSON.stringify(latestContext)).not.toContain(
			"Current goal: draft content",
		);
		const conversation = await getConversation(context, {
			id: prepared.conversationId,
			userId,
		});
		expect(conversation.data?.compactions).toHaveLength(2);
		expect(conversation.data?.context).toMatchObject({
			model: "test-model",
			tokenLimit: 4_000,
			status: "ready",
		});
	});

	test.each([
		true,
		false,
	])("recovers when saving the checkpoint fails after the summary (transactions: %s)", async (transactions) => {
		if (!transactions) {
			const supports = context.config.db.supports.bind(context.config.db);
			vi.spyOn(context.config.db, "supports").mockImplementation((feature) =>
				feature === "transaction" ? false : supports(feature),
			);
		}
		const prepared = await compactAfterReply();
		const update = AgentRunsRepository.prototype.updateWithToken;
		let interrupted = false;
		vi.spyOn(
			AgentRunsRepository.prototype,
			"updateWithToken",
		).mockImplementation(function (this: AgentRunsRepository, props) {
			if (
				!interrupted &&
				props.runId === prepared.compactId &&
				!props.checkpoint.compaction &&
				summaryOf(props.checkpoint)
			) {
				interrupted = true;
				throw new Error("Checkpoint write interrupted");
			}
			return update.call(this, props);
		});
		reply("Goal: continue drafting.");
		expect(
			await executeRun(context, { runId: prepared.compactId }),
		).toMatchObject({
			data: { status: "interrupted" },
		});
		const saved = await selectRun(prepared.compactId);
		expect(saved?.checkpoint?.compaction).toBeDefined();
		expect(saved?.checkpoint?.messages[0]).toMatchObject({ content: "Hello" });
		reply("Goal: continue drafting.");
		expect(
			await executeRun(context, { runId: prepared.compactId }),
		).toMatchObject({
			data: { status: "completed" },
		});
		expect(model.mock.calls[2]?.[1].requestId).toBe(
			model.mock.calls[1]?.[1].requestId,
		);
		const records = await context.db.kysely
			.selectFrom("lucid_agent_compactions")
			.select("id")
			.where("run_id", "=", prepared.compactId)
			.execute();
		expect(records).toHaveLength(1);
	});

	test("history retrieval is scoped to the conversation and returns bounded pages", async () => {
		const other = await prepare();
		const prepared = await prepare();
		const messages = new AgentMessagesRepository(context.db);
		const messageId = randomUUID();
		await messages.appendOnce({
			id: messageId,
			conversationId: prepared.conversationId,
			runId: prepared.runId,
			parts: [{ type: "text", text: "saved ".repeat(2000) }],
			createdAt: new Date().toISOString(),
		});
		callTool({
			id: "foreign",
			name: "lucid_read_history",
			input: { messageId: other.requestId },
		});
		callTool({ id: "first", name: "lucid_read_history", input: { messageId } });
		callTool({
			id: "rest",
			name: "lucid_read_history",
			input: { messageId, offset: 8000 },
		});
		reply("Read the saved details.");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		const parts = await partsOf(prepared.conversationId);
		expect(parts).toContainEqual(
			expect.objectContaining({
				type: "tool",
				id: "foreign",
				status: "failed",
			}),
		);
		expect(parts).toContainEqual(
			expect.objectContaining({
				type: "tool",
				id: "first",
				output: expect.objectContaining({ nextOffset: 8000 }),
			}),
		);
		expect(parts).toContainEqual(
			expect.objectContaining({
				type: "tool",
				id: "rest",
				output: expect.objectContaining({ nextOffset: null }),
			}),
		);
	});

	test("an interrupted compaction reuses its request and preserves the original context", async () => {
		const prepared = await compactAfterReply();
		model.mockImplementationOnce(async () => ({
			error: {
				type: "basic",
				status: 502,
				message: copy("server:agent.connection.failed"),
			},
			data: undefined,
		}));
		remoteRequest.mockResolvedValue({
			error: undefined,
			data: {
				json: { data: { requestId: randomUUID(), status: "processing" } },
			},
		});
		await executeRun(context, { runId: prepared.compactId });
		const interrupted = await selectRun(prepared.compactId);
		expect(interrupted?.status).toBe("interrupted");
		expect(interrupted?.checkpoint?.messages[0]).toMatchObject({
			content: "Hello",
		});
		const remoteId = model.mock.calls[1]?.[1].requestId;
		reply("Goal: continue drafting.");
		await executeRun(context, { runId: prepared.compactId });
		expect(model.mock.calls[2]?.[1].requestId).toBe(remoteId);
		expect(
			await context.db.kysely
				.selectFrom("lucid_agent_compactions")
				.select("id")
				.where("run_id", "=", prepared.compactId)
				.execute(),
		).toHaveLength(1);
	});

	test("rejects an incomplete summary and preserves its billed usage and original context", async () => {
		const prepared = await compactAfterReply();
		model.mockImplementationOnce(async (_context, input) => {
			await input.onRequest?.(connectionId);
			await input.emit({ type: "text-delta", text: "Incomplete handoff" });
			remoteRequest.mockResolvedValue({
				error: undefined,
				data: {
					json: {
						data: { requestId: input.requestId, status: "failed", usage },
					},
				},
			});
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 502,
					key: "agent_compaction_failed",
					message: copy("server:agent.compaction.failed"),
				},
			};
		});
		expect(
			await executeRun(context, { runId: prepared.compactId }),
		).toMatchObject({
			data: { status: "failed" },
		});
		expect(
			(await selectRun(prepared.compactId))?.checkpoint?.messages[0],
		).toMatchObject({ content: "Hello" });
		const records = await context.db.kysely
			.selectFrom("lucid_agent_compactions")
			.select("id")
			.where("run_id", "=", prepared.compactId)
			.execute();
		expect(records).toHaveLength(0);
		const charged = await context.db.kysely
			.selectFrom("lucid_ai_generations")
			.select(["feature_key", "credits_charged"])
			.where("agent_run_id", "=", prepared.compactId)
			.execute();
		expect(charged).toEqual([
			{ feature_key: "agent.compact", credits_charged: "0.0001" },
		]);
	});

	test("carries on without compacting when an automatic compaction fails but the request still fits", async () => {
		const prepared = await prepare();
		reply(longReply);
		await executeRun(context, { runId: prepared.runId });
		const next = randomUUID();
		await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: next,
			text: "Check the history",
		});
		//* the provider counts this request close to the limit, so compaction is due before the next turn
		model.mockImplementationOnce(async (_ctx, input) => {
			await input.emit(start());
			await input.emit({
				type: "tool-call",
				id: "missing",
				name: "lucid_read_history",
				input: { messageId: randomUUID() },
			});
			return {
				error: undefined,
				data: {
					usage: {
						...usage,
						tokens: {
							...usage.tokens,
							input: { ...usage.tokens.input, total: 3_700 },
						},
					},
					connectionId,
				},
			};
		});
		model.mockImplementationOnce(async () => ({
			error: {
				type: "basic",
				status: 502,
				message: copy("server:agent.connection.failed"),
			},
			data: undefined,
		}));
		remoteRequest.mockResolvedValue({
			error: undefined,
			data: {
				json: { data: { requestId: randomUUID(), status: "failed" } },
			},
		});
		reply("Done.");

		expect(await executeRun(context, { runId: next })).toMatchObject({
			data: { status: "completed" },
		});
		expect(model.mock.calls.slice(1).map(([, input]) => input.purpose)).toEqual(
			[undefined, "compact", undefined],
		);
		expect((await selectRun(next))?.checkpoint?.compactionFailed).toBe(true);
	});

	test("compacts and retries with a new request when the model cannot read the whole request", async () => {
		const prepared = await prepare();
		reply(longReply);
		await executeRun(context, { runId: prepared.runId });
		const next = randomUUID();
		await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: next,
			text: "Next",
		});
		model.mockImplementationOnce(async (_ctx, input) => {
			await input.emit(start());
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 502,
					key: "agent_context_exceeded",
					message: copy("server:agent.model.failed"),
				},
			};
		});
		remoteRequest.mockResolvedValue({
			error: undefined,
			data: {
				json: { data: { requestId: randomUUID(), status: "failed" } },
			},
		});
		reply("Goal: answer the next request.");
		reply("Done.");

		expect(await executeRun(context, { runId: next })).toMatchObject({
			data: { status: "completed" },
		});
		const [rejected, compaction, retried] = model.mock.calls
			.slice(1)
			.map(([, input]) => input);
		expect(compaction?.purpose).toBe("compact");
		expect(retried?.requestId).not.toBe(rejected?.requestId);
		expect(
			summaryOf(await selectRun(next).then((run) => run?.checkpoint)),
		).toBe(true);
		expect(retried?.messages.at(-1)).toEqual({ role: "user", content: "Next" });
	});

	test("loads old conversations in batches and compacts before answering", async () => {
		const prepared = await prepare();
		reply("Initial reply.");
		await executeRun(context, { runId: prepared.runId });
		const messages = new AgentMessagesRepository(context.db);
		for (let i = 0; i < 65; i++) {
			await messages.appendOnce({
				id: randomUUID(),
				conversationId: prepared.conversationId,
				runId: prepared.runId,
				parts: [
					{
						type: "text",
						text: `Saved requirement ${i}. ${"detail ".repeat(120)}`,
					},
				],
				createdAt: new Date().toISOString(),
			});
		}
		model.mockImplementation(async (_context, input) => {
			await input.emit(start());
			await input.emit({
				type: "text-delta",
				text:
					input.purpose === "compact"
						? "Keep all saved requirements; retrieve history for their exact values."
						: "Ready to continue.",
			});
			return { error: undefined, data: { usage, connectionId } };
		});
		const next = randomUUID();
		await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: next,
			text: "Continue now",
		});
		expect(await executeRun(context, { runId: next })).toMatchObject({
			data: { status: "completed" },
		});
		expect(
			model.mock.calls.filter(([, input]) => input.purpose === "compact")
				.length,
		).toBeGreaterThan(1);
		expect(model.mock.calls.at(-1)?.[1].messages.at(-1)).toEqual({
			role: "user",
			content: "Continue now",
		});
		const supplied = JSON.stringify(
			model.mock.calls.map(([, input]) => input.messages),
		);
		for (let i = 0; i < 65; i++)
			expect(supplied).toContain(`Saved requirement ${i}.`);
	});
});

describe("queued and steering inputs", () => {
	const submit = (
		conversationId: string,
		text: string,
		targetRunId?: string,
		requestId = randomUUID(),
	) =>
		submitInput(context, {
			conversationId,
			userId,
			requestId,
			text,
			delivery: targetRunId
				? { kind: "steer", targetRunId }
				: { kind: "queue" },
		});
	const pending = async (conversationId: string) =>
		(await getInputs(context, { conversationId })).data ?? [];

	test("starts follow-ups in order and accepts retries only with the original text", async () => {
		const prepared = await prepare();
		const second = randomUUID();
		const third = randomUUID();
		expect(
			(await submit(prepared.conversationId, "Second", undefined, second))
				.error,
		).toBeUndefined();
		await submit(prepared.conversationId, "Third", undefined, third);
		await submit(prepared.conversationId, "Second", undefined, second);
		expect(
			(await submit(prepared.conversationId, "Different", undefined, second))
				.error?.status,
		).toBe(409);
		expect(
			(await pending(prepared.conversationId)).map((input) => input.id),
		).toEqual([second, third]);
		expect(await selectRun(second)).toBeUndefined();
		reply("First done");
		await executeRun(context, { runId: prepared.runId });
		expect((await selectRun(second))?.status).toBe("queued");
		expect(await selectRun(third)).toBeUndefined();
		reply("Second done");
		await executeRun(context, { runId: second });
		expect((await selectRun(third))?.status).toBe("queued");
		expect(await pending(prepared.conversationId)).toEqual([]);
	});

	test("taking a message back to edit keeps later messages in order, but a claimed one cannot be taken back", async () => {
		const prepared = await prepare();
		const edited = randomUUID();
		const later = randomUUID();
		await submit(prepared.conversationId, "Original", undefined, edited);
		await submit(prepared.conversationId, "Later", undefined, later);
		const cancel = (id: string) =>
			updateInput(context, {
				conversationId: prepared.conversationId,
				userId,
				action: { kind: "cancel", id },
			});
		expect((await cancel(edited)).error).toBeUndefined();
		reply("Done");
		await executeRun(context, { runId: prepared.runId });
		expect(await selectRun(edited)).toBeUndefined();
		expect((await selectRun(later))?.status).toBe("queued");
		expect((await cancel(later)).error?.status).toBe(409);
	});

	test("stopping pauses the queue until explicitly resumed", async () => {
		const prepared = await prepare();
		const id = randomUUID();
		await submit(prepared.conversationId, "Follow up", undefined, id);
		await cancelRun(context, { runId: prepared.runId, userId });
		await advanceInputs(context, { conversationId: prepared.conversationId });
		expect(await selectRun(id)).toBeUndefined();
		expect(
			(await getConversation(context, { id: prepared.conversationId, userId }))
				.data?.queuePaused,
		).toBe(true);
		expect(
			(
				await updateInput(context, {
					conversationId: prepared.conversationId,
					userId,
					action: { kind: "resume" },
				})
			).error,
		).toBeUndefined();
		expect((await selectRun(id))?.status).toBe("queued");
	});

	test("sending to a paused chat resumes the queue in order, and clearing empties it", async () => {
		const prepared = await prepare();
		const queued = randomUUID();
		await submit(
			prepared.conversationId,
			"Queued before stop",
			undefined,
			queued,
		);
		await cancelRun(context, { runId: prepared.runId, userId });
		const sent = randomUUID();
		await submit(prepared.conversationId, "Sent after stop", undefined, sent);
		expect((await selectRun(queued))?.status).toBe("queued");
		expect(await pending(prepared.conversationId)).toMatchObject([
			{ id: sent },
		]);

		await cancelRun(context, { runId: queued, userId });
		expect(
			(
				await updateInput(context, {
					conversationId: prepared.conversationId,
					userId,
					action: { kind: "clear" },
				})
			).error,
		).toBeUndefined();
		expect(await pending(prepared.conversationId)).toEqual([]);
		expect(
			(await getConversation(context, { id: prepared.conversationId, userId }))
				.data?.queuePaused,
		).toBe(false);
	});

	test("a watching chat hears about the queue and the run that starts next", async () => {
		const prepared = await prepare();
		const next = randomUUID();
		await submit(prepared.conversationId, "Next", undefined, next);
		const events: AgentStreamEvent[] = [];
		reply("Done");
		await executeRun(context, {
			runId: prepared.runId,
			emit: async (event) => {
				events.push(event);
			},
		});
		expect(events.slice(-2)).toEqual([
			{ type: "next", runId: next },
			{ type: "inputs", inputs: [], queuePaused: false },
		]);
	});

	test("cancelling an input removes it without adding it to the transcript", async () => {
		const prepared = await prepare();
		const id = randomUUID();
		await submit(prepared.conversationId, "Never send", undefined, id);
		expect(
			(
				await updateInput(context, {
					conversationId: prepared.conversationId,
					userId,
					action: { kind: "cancel", id },
				})
			).error,
		).toBeUndefined();
		await submit(prepared.conversationId, "Never send", undefined, id);
		expect(await pending(prepared.conversationId)).toEqual([]);
		reply("Done");
		await executeRun(context, { runId: prepared.runId });
		expect(await selectRun(id)).toBeUndefined();
		expect(await partsOf(prepared.conversationId)).not.toContainEqual({
			type: "text",
			text: "Never send",
		});
	});

	test("steering a model turn skips its proposed tools and uses a fresh model request", async () => {
		const prepared = await prepare();
		const id = randomUUID();
		model.mockImplementationOnce(async (_context, input) => {
			await input.emit(start());
			await input.emit({
				type: "tool-call",
				id: "write",
				name: "test_write",
				input: {},
			});
			expect(
				(
					await submit(
						prepared.conversationId,
						"Just explain it",
						prepared.runId,
						id,
					)
				).error,
			).toBeUndefined();
			return { error: undefined, data: { usage, connectionId } };
		});
		reply("Explanation");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(writeHandler).not.toHaveBeenCalled();
		expect(model).toHaveBeenCalledTimes(2);
		expect(model.mock.calls[0]?.[1].requestId).not.toBe(
			model.mock.calls[1]?.[1].requestId,
		);
		expect(model.mock.calls[1]?.[1].messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					role: "tool",
					toolCallId: "write",
					output: expect.objectContaining({ skipped: true }),
				}),
				expect.objectContaining({ role: "user", content: "Just explain it" }),
			]),
		);
		expect(await pending(prepared.conversationId)).toEqual([]);
		await submit(
			prepared.conversationId,
			"Just explain it",
			prepared.runId,
			id,
		);
		expect(
			(await partsOf(prepared.conversationId))?.filter(
				(part) => part.type === "text" && part.text === "Just explain it",
			),
		).toHaveLength(1);
	});

	test("finishes the running tool and skips the rest of its batch", async () => {
		const prepared = await prepare();
		readHandler.mockImplementationOnce(async () => {
			await submit(prepared.conversationId, "Change direction", prepared.runId);
			return { error: undefined, data: { output: { done: true } } };
		});
		model.mockImplementationOnce(async (_context, input) => {
			await input.emit(start());
			await input.emit({
				type: "tool-call",
				id: "read",
				name: "test_read",
				input: {},
			});
			await input.emit({
				type: "tool-call",
				id: "write",
				name: "test_write",
				input: {},
			});
			return { error: undefined, data: { usage, connectionId } };
		});
		reply("Changed");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(readHandler).toHaveBeenCalledTimes(1);
		expect(writeHandler).not.toHaveBeenCalled();
		expect(await partsOf(prepared.conversationId)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "tool",
					id: "read",
					status: "complete",
					output: { done: true },
				}),
				expect.objectContaining({
					type: "tool",
					id: "write",
					status: "skipped",
				}),
			]),
		);
	});

	test("steering dismisses a pending approval without granting it", async () => {
		const prepared = await prepare();
		callTool({ id: "approval", name: "test_write", input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		await submit(prepared.conversationId, "Explain instead", prepared.runId);
		expect(enqueueRun).toHaveBeenCalledWith(context, {
			runId: prepared.runId,
			userId,
		});
		reply("Explained");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(writeHandler).not.toHaveBeenCalled();
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({
				type: "question",
				id: "approval",
				dismissed: true,
			}),
		);
	});

	test("a stale steer becomes a follow-up instead of steering the next run", async () => {
		const prepared = await prepare();
		reply("Done");
		await executeRun(context, { runId: prepared.runId });
		const next = randomUUID();
		await submit(prepared.conversationId, "Next", undefined, next);
		await submit(prepared.conversationId, "Too late", prepared.runId);
		expect(await pending(prepared.conversationId)).toMatchObject([
			{ text: "Too late", delivery: { kind: "queue" } },
		]);
		reply("Next done");
		await executeRun(context, { runId: next });
		expect(model.mock.calls.at(-1)?.[1].messages).not.toContainEqual(
			expect.objectContaining({ content: "Too late" }),
		);
	});

	test("repairs a partially started input without transactions", async () => {
		const prepared = await prepare();
		reply("Done");
		await executeRun(context, { runId: prepared.runId });
		const supports = context.config.db.supports.bind(context.config.db);
		vi.spyOn(context.config.db, "supports").mockImplementation((feature) =>
			feature === "transaction" ? false : supports(feature),
		);
		const append = vi
			.spyOn(AgentMessagesRepository.prototype, "appendOnce")
			.mockResolvedValueOnce({
				data: undefined,
				error: {
					type: "basic",
					status: 500,
					message: copy.literal("Lost connection"),
				},
			});
		const id = randomUUID();
		expect(
			(await submit(prepared.conversationId, "Recover me", undefined, id))
				.error,
		).toBeDefined();
		append.mockRestore();
		expect((await selectRun(id))?.status).toBe("queued");
		expect((await recoverInputs(context)).error).toBeUndefined();
		expect(await pending(prepared.conversationId)).toEqual([]);
		reply("Recovered");
		expect(await executeRun(context, { runId: id })).toMatchObject({
			data: { status: "completed" },
		});
		expect(model.mock.calls.at(-1)?.[1].messages).toContainEqual(
			expect.objectContaining({ role: "user", content: "Recover me" }),
		);
	});
});

test.each([
	true,
	false,
])("concurrent idle submissions keep both messages with transactions %s", async (transactions) => {
	const supports = context.config.db.supports.bind(context.config.db);
	vi.spyOn(context.config.db, "supports").mockImplementation((feature) =>
		feature === "transaction" ? transactions : supports(feature),
	);
	const prepared = await prepare();
	reply("Done");
	await executeRun(context, { runId: prepared.runId });
	const ids = [randomUUID(), randomUUID()];
	const results = await Promise.all(
		ids.map((requestId, index) =>
			submitInput(context, {
				conversationId: prepared.conversationId,
				userId,
				requestId,
				text: `Message ${index}`,
				delivery: { kind: "queue" },
			}),
		),
	);
	expect(results.every((result) => !result.error)).toBe(true);
	const conversation = await getConversation(context, {
		id: prepared.conversationId,
		userId,
	});
	expect(conversation.data?.inputs).toHaveLength(1);
	expect(ids).toContain(conversation.data?.latestRun?.id);
});

test("a lost steering acknowledgement does not inject the correction twice", async () => {
	const prepared = await prepare();
	const id = randomUUID();
	model.mockImplementationOnce(async (_context, input) => {
		await input.emit(start());
		//* a proposed tool gives the run a point to take the steer before finishing
		await input.emit({
			type: "tool-call",
			id: "read",
			name: "test_read",
			input: {},
		});
		await submitInput(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: id,
			text: "Correction",
			delivery: { kind: "steer", targetRunId: prepared.runId },
		});
		return { error: undefined, data: { usage, connectionId } };
	});
	const ack = vi
		.spyOn(AgentInputsRepository.prototype, "acknowledge")
		.mockResolvedValueOnce({
			data: undefined,
			error: {
				type: "basic",
				status: 500,
				message: copy.literal("Lost acknowledgement"),
			},
		});
	expect(
		(await executeRun(context, { runId: prepared.runId })).error,
	).toBeDefined();
	ack.mockRestore();
	const Runs = new AgentRunsRepository(context.db);
	await Runs.transition({
		runId: prepared.runId,
		from: ["running"],
		status: "interrupted",
		now: new Date().toISOString(),
	});
	reply("Corrected");
	expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
		data: { status: "completed" },
	});
	expect(
		model.mock.calls
			.at(-1)?.[1]
			.messages.filter(
				(message) =>
					message.role === "user" && message.content === "Correction",
			),
	).toHaveLength(1);
	expect(
		(await partsOf(prepared.conversationId))?.filter(
			(part) => part.type === "text" && part.text === "Correction",
		),
	).toHaveLength(1);
	expect(
		(await getInputs(context, { conversationId: prepared.conversationId }))
			.data,
	).toEqual([]);
});

test("steering accepted as the run finishes falls back to the queue", async () => {
	const prepared = await prepare();
	const id = randomUUID();
	const update = AgentRunsRepository.prototype.updateWithToken;
	vi.spyOn(AgentRunsRepository.prototype, "updateWithToken").mockImplementation(
		async function (this: AgentRunsRepository, props) {
			if (props.runId === prepared.runId && props.status === "completed") {
				// Acceptance read the active run just before its final checkpoint write.
				const Inputs = new AgentInputsRepository(context.db);
				await Inputs.submit({
					id,
					conversationId: prepared.conversationId,
					userId,
					text: "Late correction",
					targetRunId: prepared.runId,
				});
			}
			return update.call(this, props);
		},
	);
	reply("Done");
	expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
		data: { status: "completed" },
	});
	expect((await selectRun(id))?.status).toBe("queued");
	reply("Follow up");
	await executeRun(context, { runId: id });
	expect(model.mock.calls.at(-1)?.[1].messages).toContainEqual(
		expect.objectContaining({ role: "user", content: "Late correction" }),
	);
});

describe("runs acting as the system", () => {
	const prepareSystem = async () => {
		const conversation = await insertConversation(context, {
			agentKey: testAgent.key,
			userId: null,
		});
		if (conversation.error) throw new Error(JSON.stringify(conversation.error));
		const run = await startRun(context, {
			userId: null,
			conversationId: conversation.data.id,
			text: "Audit",
			requestId: randomUUID(),
		});
		if (run.error) throw run.error;
		return { runId: run.data.runId, conversationId: conversation.data.id };
	};

	test("cannot ask questions, and an approved write acts for its approver", async () => {
		const prepared = await prepareSystem();
		callTool({ id: "w1", name: "test_write", input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		expect(
			model.mock.calls[0]?.[1].tools.map((tool) => tool.name),
		).not.toContain("lucid_ask_user");

		reply("Written.");
		await executeRun(context, {
			runId: prepared.runId,
			answer: { questionId: "w1", answer: "approve", userId },
		});
		expect(writeHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				execution: expect.objectContaining({
					authority: expect.objectContaining({
						principal: { type: "user", userId },
					}),
				}),
			}),
		);
	});

	test("a steer from someone else becomes a follow-up that acts for them", async () => {
		const prepared = await prepareSystem();
		const id = randomUUID();
		await submitInput(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: id,
			text: "Also check the blog",
			delivery: { kind: "steer", targetRunId: prepared.runId },
		});
		expect(
			(await getInputs(context, { conversationId: prepared.conversationId }))
				.data,
		).toMatchObject([{ id, delivery: { kind: "queue" } }]);

		reply("Done");
		await executeRun(context, { runId: prepared.runId });
		const Runs = new AgentRunsRepository(context.db);
		expect(
			(
				await Runs.selectSingle({
					select: ["user_id"],
					where: [{ key: "id", operator: "=", value: id }],
				})
			).data,
		).toEqual({ user_id: userId });
	});
});
