import { randomUUID } from "node:crypto";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import z from "zod";
import type { ModelUsage } from "../../libs/agent/types.js";
import Migration00000014 from "../../libs/db/migrations/00000014-agent.js";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import {
	AgentMessagesRepository,
	AgentRunsRepository,
	AiGenerationsRepository,
} from "../../libs/repositories/index.js";
import defineTool from "../../libs/tools/define-tool.js";
import type { AgentStreamEvent } from "../../types/response.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createConversation from "./create-conversation.js";
import createRoutine from "./create-routine.js";
import executeRun from "./execute-run.js";
import enqueueRun from "./helpers/enqueue-run.js";
import streamModelTurn from "./helpers/stream-model-turn.js";
import sumCredits from "./helpers/sum-credits.js";
import startRun from "./start-run.js";
import watchRun from "./watch-run.js";

const remoteRequest = vi.fn();
vi.mock("./helpers/check-agent-access.js", () => ({
	default: vi.fn(async (_context, input) => ({
		error: undefined,
		data: { userId: input.userId, permissions: [], superAdmin: false },
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
			ai: {
				...config.ai,
				tools: { ...config.ai.tools, definitions: [writeTool] },
			},
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
beforeEach(() => {
	model.mockReset();
	remoteRequest.mockReset();
	writeHandler.mockClear();
	vi.mocked(enqueueRun).mockClear();
});

const prepare = async (props?: { routineId?: string }) => {
	const conversation = await createConversation(context, {
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
		await input.emit({ type: "text-delta", text });
		return { error: undefined, data: { usage, connectionId } };
	});
const callTool = (call: {
	id: string;
	name: string;
	input: Record<string, unknown>;
}) =>
	model.mockImplementationOnce(async (_ctx, input) => {
		await input.emit({ type: "tool-call", ...call });
		return { error: undefined, data: { usage, connectionId } };
	});
const partsOf = async (conversationId: string) =>
	(
		await new AgentMessagesRepository(context.db).selectLatest({
			conversationId,
			limit: 20,
		})
	).data?.flatMap((message) => message.parts);
const selectRun = async (runId: string) =>
	(
		await new AgentRunsRepository(context.db).selectSingle({
			select: ["status", "outcome", "summary", "checkpoint"],
			where: [{ key: "id", operator: "=", value: runId }],
		})
	).data;

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
		const costs = await new AiGenerationsRepository(
			context.db,
		).agentUsageByRuns([prepared.runId]);
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
				answer: { questionId: "q1", answer: "Blue" },
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
				answer: { questionId: "w1", answer: "Sure" },
			}),
		).toMatchObject({ error: { status: 400 } });

		reply("Written.");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: { questionId: "w1", answer: "approve" },
			}),
		).toMatchObject({ data: { status: "completed" } });
		await executeRun(context, { runId: prepared.runId });
		expect(writeHandler).toHaveBeenCalledTimes(1);
		expect(writeHandler).toHaveBeenCalledWith(
			expect.objectContaining({ input }),
		);
	});

	test("a new message replaces a paused run but never a live one", async () => {
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
			data: { runId: next.requestId },
		});
		expect((await selectRun(prepared.runId))?.status).toBe("cancelled");
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
			userId,
			title: "Weekly check",
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
			userId,
			title: "Unfinished check",
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
		const record = await new AiGenerationsRepository(
			context.db,
		).selectSingleByRequestId({
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
					role: "assistant",
					parts: [{ type: "text", text: "Background reply." }],
				}),
			},
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
