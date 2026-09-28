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
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentMessagesRepository,
	AgentRunsRepository,
	AiGenerationsRepository,
} from "../../libs/repositories/index.js";
import defineAgentTool from "../../libs/tools/define-agent-tool.js";
import { agentTools } from "../../libs/tools/lucid-tools.js";
import type {
	AgentApprovalMode,
	AgentStreamEvent,
} from "../../types/response.js";
import LucidError from "../../utils/errors/lucid-error.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import runWebResearch from "../web/helpers/run-web-research.js";
import advanceInputs from "./advance-inputs.js";
import cancelRun from "./cancel-run.js";
import createRoutine from "./create-routine.js";
import executeRun from "./execute-run.js";
import getConversation from "./get-conversation.js";
import getConversationDetails from "./get-conversation-details.js";
import getInputs from "./get-inputs.js";
import getRoutine from "./get-routine.js";
import enqueueRun from "./helpers/enqueue-run.js";
import insertConversation from "./helpers/insert-conversation.js";
import resolveCapabilities from "./helpers/resolve-capabilities.js";
import streamModelTurn from "./helpers/stream-model-turn.js";
import sumCredits from "./helpers/sum-credits.js";
import recoverInputs from "./recover-inputs.js";
import startRun from "./start-run.js";
import submitInput from "./submit-input.js";
import updateConversation from "./update-conversation.js";
import updateInput from "./update-input.js";
import updateRoutine from "./update-routine.js";
import watchRun from "./watch-run.js";

const remoteRequest = vi.fn();
vi.mock("./helpers/check-agent-access.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("./helpers/check-agent-access.js")>()),
	default: vi.fn(async (_context, input) => ({
		error: undefined,
		data: {
			agent: input.agentKey === webAgent.key ? webAgent : testAgent,
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
const writeTool = defineAgentTool({
	name: "test_write",
	description: "Test write",
	input: z.object({ content: z.string().optional() }),
	output: z.object({ done: z.boolean() }),
	permissions: [],
	handler: writeHandler,
});
const restrictedWriteTool = defineAgentTool({
	name: "test_restricted_write",
	description: "Requires permission even without confirmation",
	input: z.object({}),
	output: z.object({ done: z.boolean() }),
	permissions: [],
	requiredPermissions: () => ["users:create"],
	handler: writeHandler,
});
const readHandler = vi.fn(async () => ({
	error: undefined,
	data: { output: { done: true } },
}));
const readTool = defineAgentTool({
	name: "test_read",
	description: ({ mode }) => `Read in ${mode} mode`,
	input: z.object({}),
	output: z.object({ done: z.boolean() }),
	permissions: [],
	readOnly: true,
	handler: readHandler,
});
const prepareSelection = vi.fn(async () => ({
	error: undefined,
	data: {
		interaction: {
			title: "Choose a document",
			placement: "inline" as const,
			data: { ids: [1, 2] },
		},
	},
}));
const selectedHandler = vi.fn(async (response: { id: number }) => ({
	error: undefined,
	data: { output: response },
}));
const selectionOptions = {
	description: "Select a document",
	input: z.object({}),
	output: z.object({ id: z.number() }),
	permissions: [],
	interaction: {
		key: "test-picker",
		version: 1,
		data: z.object({ ids: z.array(z.number()) }),
		response: (data: { ids: number[] }) =>
			z.object({ id: z.number().refine((id) => data.ids.includes(id)) }),
		prepare: prepareSelection,
	},
	handler: async ({ response }: { response: { id: number } }) =>
		selectedHandler(response),
};
const selectionTool = defineAgentTool({
	...selectionOptions,
	name: "test_select",
	readOnly: true,
});
const selectionWriteTool = defineAgentTool({
	...selectionOptions,
	name: "test_select_write",
});
const approvalTool = defineAgentTool({
	name: "test_approval",
	title: "save API note",
	description: "A tool that opts in to approval",
	permissions: [],
	requiresApproval: true,
	input: z.object({}),
	output: z.object({ done: z.boolean() }),
	handler: writeHandler,
});
const testAgent = defineAgent({
	key: "test",
	name: "Test Agent",
	description: "Runs tests.",
	tools: [
		agentTools.content(),
		writeTool,
		approvalTool,
		readTool,
		selectionTool,
		selectionWriteTool,
		restrictedWriteTool,
	],
});
//* its own agent, so web tool descriptions leave the compaction tests' token budgets alone
const webAgent = defineAgent({
	key: "test-web",
	name: "Web Agent",
	description: "Researches the web in tests.",
	tools: [agentTools.web()],
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

//* the limits the mocked API reports; tests lower them to reach their thresholds
let inputTokenLimit = 128_000;
let toolLimit = 128;
const start = () =>
	({ type: "start", model: "test-model", inputTokenLimit, toolLimit }) as const;

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
			ai: { ...config.ai, agents: { definitions: [testAgent, webAgent] } },
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
	toolLimit = 128;
	model.mockReset();
	remoteRequest.mockReset();
	writeHandler.mockClear();
	readHandler.mockClear();
	vi.mocked(enqueueRun).mockClear();
});

const prepare = async (props?: {
	routineId?: string;
	approvalMode?: AgentApprovalMode;
	text?: string;
	agentKey?: string;
}) => {
	const conversation = await insertConversation(context, {
		agentKey: props?.agentKey ?? testAgent.key,
		approvalMode: props?.approvalMode,
		userId,
		routineId: props?.routineId,
	});
	if (conversation.error) throw new Error(JSON.stringify(conversation.error));
	const requestId = randomUUID();
	const run = await startRun(context, {
		userId,
		conversationId: conversation.data.id,
		text: props?.text ?? "Hello",
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
const interactionId = async (conversationId: string) => {
	const part = (await partsOf(conversationId))?.findLast(
		(part) => part.type === "widget" && part.interaction?.status === "pending",
	);
	expect(part?.type).toBe("widget");
	return part?.type === "widget" ? (part.interaction?.id ?? "") : "";
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
	test.each([
		"chat",
		"routine",
	] as const)("tool descriptions receive %s context", (mode) => {
		const capabilities = resolveCapabilities(context, {
			agent: testAgent,
			authority: {
				principal: { type: "user", userId },
				permissions: [],
				superAdmin: false,
			},
			mode,
			hasHistory: false,
		});
		expect(
			capabilities.definitions.find((tool) => tool.name === readTool.name)
				?.description,
		).toBe(`Read in ${mode} mode`);
		expect(
			capabilities.definitions.some(
				(tool) => tool.name === "lucid_share_progress",
			),
		).toBe(mode === "chat");
	});

	test.each([
		{ tool: approvalTool, override: undefined, waits: true },
		{ tool: approvalTool, override: false, waits: false },
		{ tool: writeTool, override: true, waits: true },
		{ tool: writeTool, override: undefined, waits: false },
	])("routine approval for $tool.name with override $override", async ({
		tool,
		override,
		waits,
	}) => {
		const routine = await createRoutine(context, {
			agentKey: testAgent.key,
			userId,
			name: "Approval policy",
			instructions: "Write a note",
			cron: "0 9 * * 1",
			timezone: "UTC",
			enabled: false,
			tools:
				override === undefined
					? {}
					: { [tool.name]: { requiresApproval: override } },
		});
		if (routine.error) throw routine.error;
		expect(
			(await getRoutine(context, { id: routine.data.id, userId })).data?.tools,
		).toEqual(
			override === undefined
				? {}
				: { [tool.name]: { requiresApproval: override } },
		);
		const prepared = await prepare({
			routineId: routine.data.id,
			approvalMode: "automatic",
		});
		callTool({ id: "routine-policy", name: tool.name, input: {} });
		callTool({
			id: "finish",
			name: "lucid_finish_run",
			input: { outcome: "done", summary: "Written" },
		});
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: waits ? "waiting" : "completed" },
		});
		if (waits) {
			expect(writeHandler).not.toHaveBeenCalled();
			expect(
				await executeRun(context, {
					runId: prepared.runId,
					answer: {
						interactionId: await interactionId(prepared.conversationId),
						action: "submit",
						response: {},
						userId,
					},
				}),
			).toMatchObject({ data: { status: "completed" } });
		}
		expect(writeHandler).toHaveBeenCalledOnce();
	});

	test("routine settings apply to follow-ups and edits leave a pending approval intact", async () => {
		const routine = await createRoutine(context, {
			agentKey: testAgent.key,
			userId,
			name: "Snapshot policy",
			instructions: "Write",
			cron: "0 9 * * 1",
			timezone: "UTC",
			enabled: false,
			tools: { [writeTool.name]: { requiresApproval: true } },
		});
		if (routine.error) throw routine.error;
		const prepared = await prepare({ routineId: routine.data.id });
		callTool({ id: "snapshot", name: writeTool.name, input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		expect(
			(
				await updateRoutine(context, {
					id: routine.data.id,
					userId,
					tools: {},
				})
			).error,
		).toBeUndefined();
		expect((await selectRun(prepared.runId))?.checkpoint?.routineTools).toEqual(
			{ [writeTool.name]: { requiresApproval: true } },
		);
		expect(
			(
				await updateConversation(context, {
					id: prepared.conversationId,
					userId,
					approvalMode: "automatic",
				})
			).error?.status,
		).toBe(400);
		callTool({
			id: "finish",
			name: "lucid_finish_run",
			input: { outcome: "done", summary: "Denied" },
		});
		await executeRun(context, {
			runId: prepared.runId,
			answer: {
				interactionId: await interactionId(prepared.conversationId),
				action: "cancel",
				response: {},
				userId,
			},
		});
		expect(writeHandler).not.toHaveBeenCalled();
		const followup = await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			text: "Try again",
			requestId: randomUUID(),
		});
		if (followup.error) throw followup.error;
		expect((await selectRun(followup.data.runId))?.checkpoint).toMatchObject({
			approvalMode: "tool-defaults",
			routineTools: {},
		});
		callTool({ id: "followup", name: writeTool.name, input: {} });
		reply("Done");
		expect(
			await executeRun(context, { runId: followup.data.runId }),
		).toMatchObject({ data: { status: "completed" } });
		expect(writeHandler).toHaveBeenCalledOnce();
	});

	test("routine overrides cannot bypass an interactive tool's request", async () => {
		const routine = await createRoutine(context, {
			agentKey: testAgent.key,
			userId,
			name: "Interactive policy",
			instructions: "Select",
			cron: "0 9 * * 1",
			timezone: "UTC",
			enabled: false,
			tools: { [selectionTool.name]: { requiresApproval: false } },
		});
		if (routine.error) throw routine.error;
		const prepared = await prepare({ routineId: routine.data.id });
		callTool({ id: "interactive-policy", name: selectionTool.name, input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		expect(
			(await selectRun(prepared.runId))?.checkpoint?.pending?.widget.key,
		).toBe(selectionTool.interaction?.key);
	});

	test.each([
		{ mode: "tool-defaults", tool: writeTool, waits: false },
		{ mode: "tool-defaults", tool: approvalTool, waits: true },
		{ mode: "automatic", tool: approvalTool, waits: false },
		{ mode: "confirm-all", tool: writeTool, waits: true },
		{ mode: "confirm-all", tool: readTool, waits: true },
	] as const)("$mode applies to $tool.name", async ({ mode, tool, waits }) => {
		const handler = tool === readTool ? readHandler : writeHandler;
		const prepared = await prepare({ approvalMode: mode });
		callTool({ id: "policy", name: tool.name, input: {} });
		reply("Done");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: waits ? "waiting" : "completed" },
		});
		if (!waits) return;
		expect(handler).not.toHaveBeenCalled();
		expect(
			(await selectRun(prepared.runId))?.checkpoint?.pending?.widget.interaction
				.title,
		).toBe(context.translate(tool.title));
		const id = await interactionId(prepared.conversationId);
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: { interactionId: id, action: "submit", response: {}, userId },
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(handler).toHaveBeenCalledOnce();
	});

	test("denial skips execution and a chat policy change only affects later runs", async () => {
		const prepared = await prepare({ approvalMode: "confirm-all" });
		await new AgentConversationsRepository(context.db).updateSingle({
			where: [{ key: "id", operator: "=", value: prepared.conversationId }],
			data: { approval_mode: "automatic" },
		});
		callTool({ id: "denied", name: writeTool.name, input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		reply("Cancelled");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: await interactionId(prepared.conversationId),
					action: "cancel",
					response: {},
					userId,
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(writeHandler).not.toHaveBeenCalled();
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({
				type: "tool",
				id: "denied",
				output: { error: context.translate("server:agent.tool.denied") },
			}),
		);
		const next = await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			text: "Continue",
			requestId: randomUUID(),
		});
		if (next.error) throw next.error;
		expect((await selectRun(next.data.runId))?.checkpoint?.approvalMode).toBe(
			"automatic",
		);
	});

	test("only the person the run acts for can respond", async () => {
		const prepared = await prepare({ approvalMode: "tool-defaults" });
		callTool({ id: "approval", name: approvalTool.name, input: {} });
		await executeRun(context, { runId: prepared.runId });
		const otherUserId = (
			await context.db.kysely
				.insertInto("lucid_users")
				.values({
					email: "other-responder@example.test",
					username: "other-responder",
					secret: "test",
				})
				.returning("id")
				.executeTakeFirstOrThrow()
		).id;
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: await interactionId(prepared.conversationId),
					action: "submit",
					response: {},
					userId: otherUserId,
				},
			}),
		).toMatchObject({ error: { status: 403 } });
		expect(writeHandler).not.toHaveBeenCalled();
		expect((await selectRun(prepared.runId))?.status).toBe("waiting");
	});

	test("an interactive write collects validated input and approval in one submission", async () => {
		prepareSelection.mockClear();
		selectedHandler.mockClear();
		const prepared = await prepare({ approvalMode: "confirm-all" });
		callTool({ id: "combined", name: selectionWriteTool.name, input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		const pending = (await selectRun(prepared.runId))?.checkpoint?.pending;
		expect(pending?.widget.interaction.approval?.toolName).toBe(
			selectionWriteTool.name,
		);
		const id = await interactionId(prepared.conversationId);
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: id,
					action: "submit",
					response: { id: 99 },
					userId,
				},
			}),
		).toMatchObject({ error: { status: 400 } });
		expect(selectedHandler).not.toHaveBeenCalled();
		reply("Saved");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: id,
					action: "submit",
					response: { id: 1 },
					userId,
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(prepareSelection).toHaveBeenCalledOnce();
		expect(selectedHandler).toHaveBeenCalledOnce();
	});

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

	test("shares multiple progress updates and continues the same chat run", async () => {
		const prepared = await prepare();
		callTool({
			id: "progress-1",
			name: "lucid_share_progress",
			input: { message: "I found the relevant pages." },
		});
		callTool({
			id: "progress-2",
			name: "lucid_share_progress",
			input: { message: "I checked their current status." },
		});
		reply("Here is the result.");

		const events: AgentStreamEvent[] = [];
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				emit: async (event) => {
					events.push(event);
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(model).toHaveBeenCalledTimes(3);
		expect(events.filter((event) => event.type === "start")).toHaveLength(3);
		expect(
			events.filter(
				(event) => event.type === "tool" && event.status === "complete",
			),
		).toMatchObject([
			{
				name: "lucid_share_progress",
				input: { message: "I found the relevant pages." },
			},
			{
				name: "lucid_share_progress",
				input: { message: "I checked their current status." },
			},
		]);

		const messages = new AgentMessagesRepository(context.db);
		const saved = await messages.selectLatest({
			conversationId: prepared.conversationId,
			limit: 10,
		});
		expect(
			saved.data?.toReversed().map((message) => message.parts),
		).toMatchObject([
			[{ type: "text", text: "Hello" }],
			[
				{
					type: "tool",
					input: { message: "I found the relevant pages." },
					status: "complete",
				},
			],
			[
				{
					type: "tool",
					input: { message: "I checked their current status." },
					status: "complete",
				},
			],
			[{ type: "text", text: "Here is the result." }],
		]);
	});

	test("a saved inline interaction rejects invalid choices and resumes without repeating preparation", async () => {
		prepareSelection.mockClear();
		selectedHandler.mockClear();
		const prepared = await prepare();
		callTool({ id: "choose", name: "test_select", input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		const id = await interactionId(prepared.conversationId);
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					action: "submit",
					interactionId: id,
					response: { id: 99 },
					userId,
				},
			}),
		).toMatchObject({ error: { status: 400 } });
		expect(selectedHandler).not.toHaveBeenCalled();
		expect((await selectRun(prepared.runId))?.status).toBe("waiting");
		reply("Selected");
		const events: AgentStreamEvent[] = [];
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					action: "submit",
					interactionId: id,
					response: { id: 2 },
					userId,
				},
				emit: async (event) => {
					events.push(event);
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(prepareSelection).toHaveBeenCalledTimes(1);
		expect(selectedHandler).toHaveBeenCalledWith({ id: 2 });
		expect(events).toContainEqual(
			expect.objectContaining({
				type: "widget",
				interaction: expect.objectContaining({
					id,
					status: "answered",
					response: { id: 2 },
				}),
			}),
		);
		expect(model.mock.calls.at(-1)?.[1].messages).toContainEqual(
			expect.objectContaining({
				role: "tool",
				toolCallId: "choose",
				output: { id: 2 },
			}),
		);
		await executeRun(context, {
			runId: prepared.runId,
			answer: {
				action: "submit",
				interactionId: id,
				response: { id: 2 },
				userId,
			},
		});
		expect(selectedHandler).toHaveBeenCalledTimes(1);
	});

	test("a write tool collects its input and executes on submission", async () => {
		prepareSelection.mockClear();
		selectedHandler.mockClear();
		const prepared = await prepare();
		callTool({ id: "choose-write", name: "test_select_write", input: {} });
		await executeRun(context, { runId: prepared.runId });
		const id = await interactionId(prepared.conversationId);
		expect(selectedHandler).not.toHaveBeenCalled();

		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: id,
					action: "submit",
					response: { id: 99 },
					userId,
				},
			}),
		).toMatchObject({ error: { status: 400 } });
		expect(selectedHandler).not.toHaveBeenCalled();
		reply("Saved");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: id,
					action: "submit",
					response: { id: 1 },
					userId,
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(prepareSelection).toHaveBeenCalledTimes(1);
		expect(selectedHandler).toHaveBeenCalledOnce();
		expect(selectedHandler).toHaveBeenCalledWith({ id: 1 });
		expect(
			(await partsOf(prepared.conversationId))?.filter(
				(part) => part.type === "widget",
			),
		).toHaveLength(1);
	});

	test.each([
		"test_select",
		"test_select_write",
	])("cancelling %s does not require valid form input or execute its handler", async (name) => {
		selectedHandler.mockClear();
		const prepared = await prepare();
		callTool({ id: "cancelled", name, input: {} });
		await executeRun(context, { runId: prepared.runId });
		const id = await interactionId(prepared.conversationId);
		reply("Cancelled");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: { interactionId: id, action: "cancel", response: {}, userId },
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(selectedHandler).not.toHaveBeenCalled();
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({
				type: "widget",
				interaction: expect.objectContaining({ id, status: "cancelled" }),
			}),
		);
	});

	test("an accepted response survives interruption before the handler starts", async () => {
		prepareSelection.mockClear();
		selectedHandler.mockClear();
		const prepared = await prepare();
		callTool({ id: "choose", name: "test_select", input: {} });
		await executeRun(context, { runId: prepared.runId });
		const abort = new AbortController();
		await executeRun(context, {
			runId: prepared.runId,
			signal: abort.signal,
			answer: {
				interactionId: await interactionId(prepared.conversationId),
				action: "submit",
				response: { id: 1 },
				userId,
			},
			emit: async (event) => {
				if (event.type === "widget" && event.interaction?.status === "answered")
					abort.abort();
			},
		});
		expect(selectedHandler).not.toHaveBeenCalled();
		reply("Selected after recovery");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(selectedHandler).toHaveBeenCalledWith({ id: 1 });
		expect(prepareSelection).toHaveBeenCalledTimes(1);
	});

	test("concurrent submissions resolve an interaction once", async () => {
		prepareSelection.mockClear();
		selectedHandler.mockClear();
		const prepared = await prepare();
		callTool({ id: "choose", name: "test_select", input: {} });
		await executeRun(context, { runId: prepared.runId });
		const answer = {
			interactionId: await interactionId(prepared.conversationId),
			action: "submit" as const,
			response: { id: 2 },
			userId,
		};
		reply("Selected once");
		const results = await Promise.all([
			executeRun(context, { runId: prepared.runId, answer }),
			executeRun(context, { runId: prepared.runId, answer }),
		]);
		expect(
			results.filter((result) => result.data?.status === "completed"),
		).toHaveLength(1);
		expect(selectedHandler).toHaveBeenCalledOnce();
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
			expect.objectContaining({ type: "widget", key: "lucid-question" }),
		);
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({ type: "widget", key: "lucid-question" }),
		);
		expect(
			(await executeRun(context, { runId: prepared.runId })).error?.status,
		).toBe(409);

		reply("Blue it is.");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: await interactionId(prepared.conversationId),
					action: "submit",
					response: { answer: "Blue" },
					userId,
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(model.mock.calls[1]?.[1].messages).toContainEqual({
			role: "tool",
			toolCallId: "q1",
			name: "lucid_ask_user",
			output: { answer: "Blue" },
		});
	});

	test.each([
		"chat",
		"routine",
	])("a write runs once as its user in a %s without requesting input", async (mode) => {
		let routineId: string | undefined;
		if (mode === "routine") {
			const routine = await createRoutine(context, {
				agentKey: testAgent.key,
				userId,
				name: "Automatic write",
				tools: { [approvalTool.name]: { requiresApproval: false } },
				instructions: "Write a note.",
				cron: "0 9 * * 1",
				timezone: "UTC",
				enabled: false,
			});
			if (routine.error) throw routine.error;
			routineId = routine.data.id;
		}
		const prepared = await prepare({
			routineId,
			approvalMode: mode === "routine" ? "confirm-all" : "automatic",
		});
		callTool({
			id: "automatic",
			name: mode === "routine" ? approvalTool.name : writeTool.name,
			input: {},
		});
		if (mode === "routine")
			callTool({
				id: "finish",
				name: "lucid_finish_run",
				input: { outcome: "done", summary: "Written" },
			});
		else reply("Written");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		await executeRun(context, { runId: prepared.runId });
		expect(writeHandler).toHaveBeenCalledOnce();
		expect(writeHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				execution: expect.objectContaining({
					authority: expect.objectContaining({
						principal: { type: "user", userId },
					}),
					operationId: `${prepared.runId}:automatic`,
				}),
			}),
		);
		expect(
			(await partsOf(prepared.conversationId))?.some(
				(part) => part.type === "widget",
			),
		).toBe(false);
	});

	test("writes enforce input-dependent permissions", async () => {
		const prepared = await prepare();
		callTool({
			id: "restricted",
			name: restrictedWriteTool.name,
			input: {},
		});
		reply("Not permitted");
		await executeRun(context, { runId: prepared.runId });
		expect(writeHandler).not.toHaveBeenCalled();
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({
				type: "tool",
				id: "restricted",
				status: "failed",
			}),
		);
	});

	test("an uncertain write is never executed again on recovery", async () => {
		const prepared = await prepare();
		const update = AgentRunsRepository.prototype.updateWithToken;
		const fail = vi
			.spyOn(AgentRunsRepository.prototype, "updateWithToken")
			.mockImplementation(function (this: AgentRunsRepository, props) {
				if (writeHandler.mock.calls.length && !props.checkpoint.inFlightWrite)
					throw new LucidError({ message: "Lost write outcome" });
				return update.call(this, props);
			});
		callTool({ id: "uncertain", name: writeTool.name, input: {} });
		await expect(
			executeRun(context, { runId: prepared.runId }),
		).rejects.toThrow("Lost write outcome");
		fail.mockRestore();
		await new AgentRunsRepository(context.db).transition({
			runId: prepared.runId,
			from: ["running"],
			status: "interrupted",
			now: new Date().toISOString(),
		});
		expect((await selectRun(prepared.runId))?.checkpoint?.inFlightWrite).toBe(
			"uncertain",
		);
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "failed" },
		});
		expect(writeHandler).toHaveBeenCalledOnce();
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
		(JSON.stringify(checkpoint?.messages[0]) ?? "").includes(
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
		inputTokenLimit = 5_000;
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
			tokenLimit: 5_000,
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
		inputTokenLimit = 16_000;
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

	test("a manager approves a system write without lending it their identity", async () => {
		const prepared = await prepareSystem();
		callTool({ id: "system-approval", name: approvalTool.name, input: {} });
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "waiting" },
		});
		reply("Written");
		expect(
			await executeRun(context, {
				runId: prepared.runId,
				answer: {
					interactionId: await interactionId(prepared.conversationId),
					action: "submit",
					response: {},
					userId,
				},
			}),
		).toMatchObject({ data: { status: "completed" } });
		expect(writeHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				execution: expect.objectContaining({
					authority: expect.objectContaining({ principal: { type: "system" } }),
				}),
			}),
		);
		expect(await partsOf(prepared.conversationId)).toContainEqual(
			expect.objectContaining({
				type: "widget",
				interaction: expect.objectContaining({
					status: "answered",
					answeredByUserId: userId,
				}),
			}),
		);
	});

	test("writes retain the system authority", async () => {
		const prepared = await prepareSystem();
		callTool({ id: "system-write", name: writeTool.name, input: {} });
		reply("Written");
		expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
			data: { status: "completed" },
		});
		expect(writeHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				execution: expect.objectContaining({
					authority: expect.objectContaining({ principal: { type: "system" } }),
				}),
			}),
		);
	});

	test("interactive tools are offered for agent managers to answer", async () => {
		const prepared = await prepareSystem();
		reply("Done");
		await executeRun(context, { runId: prepared.runId });
		const offered = model.mock.calls
			.at(-1)?.[1]
			.tools.map((tool: { name: string }) => tool.name);
		expect(offered).toContain(writeTool.name);
		expect(offered).toContain(selectionTool.name);
		expect(offered).toContain("lucid_ask_user");
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

vi.mock("../../libs/lucid-remote/services/get-agent-models.js", async () => {
	const { agentModelCatalog, mockAgentModels } = await import(
		"../../utils/test-helpers/agent-models.js"
	);
	return {
		default: mockAgentModels(() => ({
			...agentModelCatalog,
			models: agentModelCatalog.models.map((model) =>
				model.id === "test-model"
					? { ...model, inputTokenLimit, toolLimit }
					: model,
			),
		})),
	};
});

describe("saved model choices", () => {
	test("a change applies to the next run while a started run keeps its model", async () => {
		const prepared = await prepare();
		const changed = await updateConversation(context, {
			id: prepared.conversationId,
			userId,
			modelSelection: { modelId: "small-model" },
		});
		expect(changed.data?.modelSelection).toEqual({
			modelId: "small-model",
			reasoningEffort: null,
		});
		reply("Hello from the original model.");
		await executeRun(context, { runId: prepared.runId });
		expect(model.mock.calls[0]?.[1].selection).toEqual({
			modelId: "test-model",
			reasoningEffort: "low",
		});

		const next = await startRun(context, {
			conversationId: prepared.conversationId,
			userId,
			requestId: randomUUID(),
			text: "Continue.",
		});
		expect(next.error).toBeUndefined();
		const saved = await new AgentRunsRepository(context.db).selectSingle({
			select: ["checkpoint"],
			where: [{ key: "id", operator: "=", value: next.data?.runId ?? "" }],
		});
		expect(saved.data?.checkpoint?.selection).toEqual({
			modelId: "small-model",
			reasoningEffort: null,
		});
	});

	test("rejects a model the agent does not offer", async () => {
		const prepared = await prepare();
		const rejected = await updateConversation(context, {
			id: prepared.conversationId,
			userId,
			modelSelection: { modelId: "retired-model" },
		});
		expect(rejected.error?.status).toBe(400);
	});
});

test("web tools use normal transcript rows and persist non-model usage", async () => {
	const prepared = await prepare({ agentKey: webAgent.key });
	const feature = { key: "web.search", version: "v1" };
	const output = {
		results: [
			{
				url: "https://example.com/docs",
				title: "Docs",
				publishedAt: null,
				excerpts: ["Public documentation"],
			},
		],
	};
	remoteRequest.mockResolvedValue({
		error: undefined,
		data: {
			json: {
				data: {
					requestId: randomUUID(),
					mode: "sync",
					feature,
					output,
					usage: {
						kind: "web",
						operation: "search",
						provider: "parallel",
						requests: 1,
						model: null,
						tokens: null,
						providerRequestId: "search_1",
						cost: { creditsCharged: "12" },
					},
				},
			},
		},
	});
	callTool({
		id: "search-call",
		name: "web_search",
		input: { query: "Example docs" },
	});
	reply("Found the docs.");
	const events: AgentStreamEvent[] = [];
	const result = await executeRun(context, {
		runId: prepared.runId,
		emit: async (event) => {
			events.push(event);
		},
	});
	expect(result.error).toBeUndefined();
	const webCalls = remoteRequest.mock.calls.filter(
		([, options]) => options.body?.feature?.key === "web.search",
	);
	expect(webCalls).toHaveLength(1);
	expect(webCalls[0]?.[1]).toMatchObject({
		retries: 0,
		body: { feature, context: { query: "Example docs" } },
	});
	expect(events).toContainEqual(
		expect.objectContaining({
			type: "tool",
			name: "web_search",
			status: "running",
		}),
	);
	expect(await partsOf(prepared.conversationId)).toContainEqual(
		expect.objectContaining({
			type: "tool",
			name: "web_search",
			status: "complete",
			output,
		}),
	);
	const usage = await new AiGenerationsRepository(context.db).agentUsageByRuns([
		prepared.runId,
	]);
	expect(usage.data).toContainEqual(
		expect.objectContaining({
			calls: 1,
			model_calls: 0,
			credits_charged: "12",
		}),
	);
});

test("every attempt at one web call reuses its key, so a resumed run never pays twice", async () => {
	const prepared = await prepare({ agentKey: webAgent.key });
	remoteRequest.mockResolvedValue(webResponse("search", { results: [] }));
	const attempt = (callId: string) =>
		runWebResearch(context, {
			execution: {
				authority: {
					principal: { type: "user", userId },
					permissions: [],
					superAdmin: false,
				},
				signal: new AbortController().signal,
				operationId: `${prepared.runId}:${callId}`,
				run: {
					id: prepared.runId,
					conversationId: prepared.conversationId,
					userId,
				},
			},
			request: {
				feature: { key: "web.search", version: "v1" },
				sessionId: prepared.conversationId,
				input: [],
				context: { query: "Public docs", maxResults: 5 },
			},
		});
	for (const callId of ["search", "search", "other"]) await attempt(callId);

	const keys = webCalls().map(
		([, options]) => options.headers["idempotency-key"],
	);
	expect(keys[0]).toBe(keys[1]);
	expect(keys[2]).not.toBe(keys[0]);
	const billed = await new AiGenerationsRepository(context.db).agentUsageByRuns(
		[prepared.runId],
	);
	expect(billed.data).toContainEqual(
		expect.objectContaining({ calls: 2, model_calls: 0 }),
	);
});

/** A completed web response from the website, as the remote client returns it. */
const webResponse = (
	operation: "search" | "fetch",
	output: Record<string, unknown>,
) => ({
	error: undefined,
	data: {
		json: {
			data: {
				requestId: randomUUID(),
				mode: "sync",
				feature: { key: `web.${operation}`, version: "v1" },
				output,
				usage: {
					kind: "web",
					operation,
					provider: "parallel",
					requests: 1,
					model: null,
					tokens: null,
					providerRequestId: `${operation}_${randomUUID()}`,
					cost: { creditsCharged: "12" },
				},
			},
		},
	},
});
const webCalls = () =>
	remoteRequest.mock.calls.filter(([, options]) =>
		options.body?.feature?.key.startsWith("web."),
	);

test("confirm actions asks before web research and runs it once approved", async () => {
	const prepared = await prepare({
		agentKey: webAgent.key,
		approvalMode: "confirm-all",
	});
	remoteRequest.mockResolvedValue(webResponse("search", { results: [] }));
	callTool({
		id: "approved-search",
		name: "web_search",
		input: { query: "Example docs" },
	});
	expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
		data: { status: "waiting" },
	});
	expect(webCalls()).toHaveLength(0);
	reply("Nothing found.");
	expect(
		await executeRun(context, {
			runId: prepared.runId,
			answer: {
				interactionId: await interactionId(prepared.conversationId),
				action: "submit",
				response: {},
				userId,
			},
		}),
	).toMatchObject({ data: { status: "completed" } });
	expect(webCalls()).toHaveLength(1);
});

test("reads only pages whose URL already appeared in the chat", async () => {
	const prepared = await prepare({
		agentKey: webAgent.key,
		approvalMode: "automatic",
		text: "Summarise example.com/about for me.",
	});
	const page = {
		url: "https://example.com/docs",
		title: "Docs",
		publishedAt: null,
		content: "Public documentation",
		contentType: "page",
		truncated: false,
	};
	remoteRequest.mockImplementation(async (_path, options) =>
		options.body?.feature?.key === "web.search"
			? webResponse("search", {
					results: [{ ...page, excerpts: ["Public documentation"] }],
				})
			: webResponse("fetch", { ...page, url: options.body?.context?.url }),
	);
	callTool({
		id: "search",
		name: "web_search",
		input: { query: "Example docs" },
	});
	callTool({
		id: "from-message",
		name: "web_fetch",
		input: { url: "https://www.example.com/about/" },
	});
	callTool({
		id: "from-result",
		name: "web_fetch",
		input: { url: "https://example.com/docs" },
	});
	callTool({
		id: "with-data",
		name: "web_fetch",
		input: { url: "https://example.com/about?token=secret" },
	});
	reply("Done.");
	expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
		data: { status: "completed" },
	});
	expect(
		webCalls()
			.filter(([, options]) => options.body.feature.key === "web.fetch")
			.map(([, options]) => options.body.context),
	).toEqual([
		expect.objectContaining({
			url: "https://www.example.com/about/",
			maxChars: 20_000,
		}),
		expect.objectContaining({ url: "https://example.com/docs" }),
	]);
	expect(await partsOf(prepared.conversationId)).toContainEqual(
		expect.objectContaining({
			id: "with-data",
			status: "failed",
			output: { error: context.translate("server:agent.web.url.unseen") },
		}),
	);

	const details = await getConversationDetails(context, {
		id: prepared.conversationId,
		userId,
	});
	expect(details.data).toMatchObject({
		usage: { modelCalls: 5, webCalls: 3 },
		sources: [
			{
				url: "https://example.com/docs",
				read: true,
			},
			{ url: "https://www.example.com/about/", read: true },
		],
	});
});

test("a run stops before calling a model that accepts fewer tools than the agent offers", async () => {
	toolLimit = 2;
	const prepared = await prepare();
	expect(await executeRun(context, { runId: prepared.runId })).toMatchObject({
		data: { status: "failed" },
	});
	expect(model).not.toHaveBeenCalled();
});
