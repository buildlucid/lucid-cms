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
import constants from "../../constants/constants.js";
import defineAgent from "../../libs/agent/define-agent.js";
import defineRoutine from "../../libs/agent/define-routine.js";
import Migration00000014 from "../../libs/db/migrations/00000014-agent.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import * as jobQueue from "../../libs/jobs/enqueue.js";
import {
	AgentCompactionsRepository,
	AgentConversationsRepository,
	AgentMessagesRepository,
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import syncAgentRoutines from "../sync/sync-agent-routines.js";
import createRoutine from "./create-routine.js";
import dispatchDueRoutines from "./dispatch-due-routines.js";
import generateConversationTitle from "./generate-conversation-title.js";
import enqueueRun from "./helpers/enqueue-run.js";
import getRoutineTools from "./helpers/get-routine-tools.js";
import insertConversation from "./helpers/insert-conversation.js";
import { generateAgentTitleJob } from "./jobs/generate-title.js";
import recoverRuns from "./recover-runs.js";
import runRoutine from "./run-routine.js";
import startRun from "./start-run.js";
import updateConversation from "./update-conversation.js";
import updateRoutine from "./update-routine.js";

vi.mock("./helpers/check-agent-access.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("./helpers/check-agent-access.js")>()),
	default: vi.fn(async () => ({ error: undefined, data: {} })),
}));
vi.mock("./helpers/enqueue-run.js", () => ({
	default: vi.fn(async () => ({ error: undefined, data: undefined })),
}));
vi.mock("../connection/token-manager.js", () => ({
	default: async () => ({
		error: undefined,
		data: { accessToken: "test-token", lucidRemoteConnectionId: 1 },
	}),
}));

const testConfig = getTestConfig();
let context: ServiceContext;
let userId: number;
let Routines: AgentRoutinesRepository;
let Runs: AgentRunsRepository;
let Conversations: AgentConversationsRepository;
let Compactions: AgentCompactionsRepository;
let Messages: AgentMessagesRepository;
const auditRoutine = defineRoutine({
	key: "audit",
	name: "Weekly audit",
	instructions: "Audit the site.",
	schedule: { cron: "0 9 * * 1" },
});
const testAgent = defineAgent({
	key: "test",
	name: "Test Agent",
	description: "Runs tests.",
	tools: [],
	routines: [auditRoutine],
});

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
			ai: { ...config.ai, agents: { definitions: [testAgent] } },
		},
		database,
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	Routines = new AgentRoutinesRepository(context.db);
	Runs = new AgentRunsRepository(context.db);
	Conversations = new AgentConversationsRepository(context.db);
	Compactions = new AgentCompactionsRepository(context.db);
	Messages = new AgentMessagesRepository(context.db);
	userId = (
		await database.client
			.insertInto("lucid_users")
			.values({
				email: "routines@example.test",
				username: "routines",
				secret: "test",
			})
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
});
afterAll(() => testConfig.destroy());
beforeEach(() => vi.mocked(enqueueRun).mockClear());

test("a manual rename wins when automatic title generation finishes later", async () => {
	const created = await insertConversation(context, {
		agentKey: testAgent.key,
		userId,
	});
	expect(created.error).toBeUndefined();
	if (created.error) return;

	const conversations = new AgentConversationsRepository(context.db);
	const requestedAt = new Date().toISOString();
	expect(
		await conversations.beginTitleGeneration({
			conversationId: created.data.id,
			requestedAt,
		}),
	).toMatchObject({ data: true });

	const renamed = await updateConversation(context, {
		id: created.data.id,
		userId,
		title: "My own title",
	});
	expect(renamed).toMatchObject({
		data: { title: "My own title", titleStatus: "user_set" },
	});
	expect(
		await conversations.completeGeneratedTitle({
			conversationId: created.data.id,
			requestedAt,
			title: "Late AI title",
		}),
	).toMatchObject({ data: false });
	const final = await conversations.selectSingle({
		select: ["title", "title_status"],
		where: [{ key: "id", operator: "=", value: created.data.id }],
	});
	expect(final.data).toEqual({
		title: "My own title",
		title_status: "user_set",
	});
});

test("a title queue failure leaves the first message and provisional title intact", async () => {
	const created = await insertConversation(context, {
		agentKey: testAgent.key,
		userId,
	});
	expect(created.error).toBeUndefined();
	if (created.error) return;

	const queue = vi.spyOn(jobQueue, "enqueueJob").mockResolvedValue({
		error: { message: "Title queue unavailable" },
		data: undefined,
	});
	try {
		const started = await startRun(context, {
			conversationId: created.data.id,
			userId,
			requestId: randomUUID(),
			text: "Explain cache validation",
		});
		expect(started.error).toBeUndefined();

		const AgentConversations = new AgentConversationsRepository(context.db);
		const saved = await AgentConversations.selectSingle({
			select: ["title", "title_status", "title_generation_requested_at"],
			where: [{ key: "id", operator: "=", value: created.data.id }],
		});
		expect(saved.data).toMatchObject({
			title: "Explain cache validation",
			title_status: "provisional",
			title_generation_requested_at: null,
		});
	} finally {
		queue.mockRestore();
	}
});

test("turning off chat rename keeps the provisional title and refuses generated ones", async () => {
	context.config.ai.features.chatRename = false;
	const queue = vi.spyOn(jobQueue, "enqueueJob");
	try {
		const created = await insertConversation(context, {
			agentKey: testAgent.key,
			userId,
		});
		if (created.error) throw new Error(JSON.stringify(created.error));
		const started = await startRun(context, {
			conversationId: created.data.id,
			userId,
			requestId: randomUUID(),
			text: "Plan the launch page",
		});
		expect(started.error).toBeUndefined();
		expect(queue).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ job: generateAgentTitleJob }),
		);

		const generated = await generateConversationTitle(context, {
			id: created.data.id,
			userId,
		});
		expect(generated.error?.status).toBe(403);
	} finally {
		context.config.ai.features.chatRename = true;
		queue.mockRestore();
	}
});

const dueRoutine = async (conversationMode: "new" | "reuse" = "new") => {
	const routine = await createRoutine(context, {
		conversationMode,
		agentKey: testAgent.key,
		userId,
		name: "Daily review",
		instructions: "Review today's changes.",
		cron: "0 9 * * *",
		timezone: "UTC",
		enabled: true,
	});
	if (routine.error) throw new Error(JSON.stringify(routine.error));
	await Routines.updateSingle({
		where: [{ key: "id", operator: "=", value: routine.data.id }],
		data: { next_run_at: new Date(Date.now() - 60_000).toISOString() },
	});
	return routine.data;
};
const routineRuns = async (routineId: string) =>
	(
		await Runs.selectMultiple({
			select: ["id", "status", "checkpoint", "conversation_id"],
			where: [{ key: "routine_id", operator: "=", value: routineId }],
		})
	).data ?? [];
const nextRunAt = async (routineId: string) =>
	(
		await Routines.selectSingle({
			select: ["next_run_at"],
			where: [{ key: "id", operator: "=", value: routineId }],
		})
	).data?.next_run_at;

describe("routine dispatch", () => {
	test("starts a queued run in a new conversation and advances the schedule", async () => {
		const routine = await dueRoutine();
		expect(await dispatchDueRoutines(context)).toMatchObject({ data: 1 });

		const [run] = await routineRuns(routine.id);
		expect(run?.status).toBe("queued");
		expect(enqueueRun).toHaveBeenCalledWith(expect.anything(), {
			runId: run?.id,
			userId,
		});
		const AgentConversations = new AgentConversationsRepository(context.db);
		const conversation = await AgentConversations.selectSingleWithLatestRun({
			id: run?.conversation_id ?? "",
		});
		expect(conversation.data).toMatchObject({
			agent_key: testAgent.key,
			routine_id: routine.id,
			user_id: userId,
		});
		expect(
			new Date(String(await nextRunAt(routine.id))).getTime(),
		).toBeGreaterThan(Date.now());
	});

	test("silently skips an occurrence while the previous run is unfinished", async () => {
		const routine = await dueRoutine();
		await dispatchDueRoutines(context);
		const [run] = await routineRuns(routine.id);
		await Runs.transition({
			runId: run?.id ?? "",
			from: ["queued"],
			status: "waiting",
			now: new Date().toISOString(),
		});
		await Routines.updateSingle({
			where: [{ key: "id", operator: "=", value: routine.id }],
			data: { next_run_at: new Date(Date.now() - 60_000).toISOString() },
		});

		expect(await dispatchDueRoutines(context)).toMatchObject({ data: 0 });
		expect(await routineRuns(routine.id)).toHaveLength(1);
		expect(
			new Date(String(await nextRunAt(routine.id))).getTime(),
		).toBeGreaterThan(Date.now());
	});

	test("gives the next run the previous run's summary", async () => {
		const routine = await dueRoutine();
		await dispatchDueRoutines(context);
		const [first] = await routineRuns(routine.id);
		await Runs.updateSingle({
			where: [{ key: "id", operator: "=", value: first?.id ?? "" }],
			data: {
				status: "completed",
				summary: "Found two broken links.",
				finished_at: new Date().toISOString(),
			},
		});
		await Routines.updateSingle({
			where: [{ key: "id", operator: "=", value: routine.id }],
			data: { next_run_at: new Date(Date.now() - 60_000).toISOString() },
		});

		await dispatchDueRoutines(context);
		const second = (await routineRuns(routine.id)).find(
			(run) => run.id !== first?.id,
		);
		expect(second?.checkpoint?.extraContext).toContain(
			"Found two broken links.",
		);
	});
});

describe("routine chat reuse", () => {
	const finishOccurrence = async (runId: string, conversationId: string) => {
		await Runs.updateSingle({
			where: [{ key: "id", operator: "=", value: runId }],
			data: {
				status: "completed",
				summary: "Previous result",
				finished_at: new Date().toISOString(),
			},
		});
		await Conversations.releaseRun({
			conversationId,
			runId,
			updatedAt: new Date().toISOString(),
		});
	};
	test("reuses history, adopts the latest chat when switched, and starts fresh when switched back", async () => {
		const routine = await dueRoutine();
		const first = await runRoutine(context, { id: routine.id, userId });
		if (first.error) throw first.error;
		await finishOccurrence(first.data.runId, first.data.conversationId);
		const second = await runRoutine(context, { id: routine.id, userId });
		if (second.error) throw second.error;
		expect(second.data.conversationId).not.toBe(first.data.conversationId);
		await finishOccurrence(second.data.runId, second.data.conversationId);
		const switched = await updateRoutine(context, {
			id: routine.id,
			userId,
			conversationMode: "reuse",
		});
		expect(switched.data?.conversationId).toBe(second.data.conversationId);
		const third = await runRoutine(context, { id: routine.id, userId });
		if (third.error) throw third.error;
		expect(third.data.conversationId).toBe(second.data.conversationId);
		const run = (await routineRuns(routine.id)).find(
			(run) => run.id === third.data.runId,
		);
		expect(run?.checkpoint?.extraContext).toBeUndefined();
		expect(run?.checkpoint?.historyAfter).toBe(0);
		await finishOccurrence(third.data.runId, third.data.conversationId);
		await updateRoutine(context, {
			id: routine.id,
			userId,
			conversationMode: "new",
		});
		const fourth = await runRoutine(context, { id: routine.id, userId });
		expect(fourth.data?.conversationId).not.toBe(third.data.conversationId);
		expect(
			(await routineRuns(routine.id)).find(
				(run) => run.id === fourth.data?.runId,
			)?.checkpoint?.extraContext,
		).toContain("Previous result");
	});
	test("repeats instructions only when they changed or were compacted away", async () => {
		const routine = await dueRoutine("reuse");
		//* each run finishes when the next one starts, so the last stays active like the other tests
		let previous: { runId: string; conversationId: string } | undefined;
		const requestText = async () => {
			if (previous) {
				await finishOccurrence(previous.runId, previous.conversationId);
			}
			const run = await runRoutine(context, { id: routine.id, userId });
			if (run.error) throw run.error;
			previous = run.data;
			const message = await Messages.selectSingle({
				select: ["parts", "position", "conversation_id"],
				where: [{ key: "id", operator: "=", value: run.data.runId }],
			});
			return {
				...message.data,
				runId: run.data.runId,
				text: message.data?.parts.find((part) => part.type === "text"),
			};
		};

		expect((await requestText()).text).toBeDefined();
		expect((await requestText()).text).toBeUndefined();
		await updateRoutine(context, {
			id: routine.id,
			userId,
			instructions: "Check the new things.",
		});
		const changed = await requestText();
		expect(changed.text).toEqual({
			type: "text",
			text: "Check the new things.",
		});
		if (!changed.conversation_id || changed.position === undefined) {
			throw new Error("Missing request");
		}
		await Compactions.createSingle({
			data: {
				id: randomUUID(),
				run_id: changed.runId,
				conversation_id: changed.conversation_id,
				through_position: changed.position,
				summary: "Earlier runs.",
				created_at: new Date().toISOString(),
			},
		});
		expect((await requestText()).text).toBeDefined();
	});

	test("continues from the saved compaction in a reused chat", async () => {
		const routine = await dueRoutine("reuse");
		const first = await runRoutine(context, { id: routine.id, userId });
		if (first.error) throw first.error;
		await finishOccurrence(first.data.runId, first.data.conversationId);
		await Compactions.createSingle({
			data: {
				id: randomUUID(),
				run_id: first.data.runId,
				conversation_id: first.data.conversationId,
				through_position: 1,
				summary: "Keep the earlier decisions.",
				created_at: new Date().toISOString(),
			},
		});
		const second = await runRoutine(context, { id: routine.id, userId });
		const run = (await routineRuns(routine.id)).find(
			(run) => run.id === second.data?.runId,
		);
		expect(run?.checkpoint).toMatchObject({
			historyAfter: 1,
			trimmed: true,
			messages: [
				{
					role: "user",
					content: expect.stringContaining("Keep the earlier decisions."),
				},
			],
		});
	});

	test("creates a target on the first run, and replaces a deleted target", async () => {
		const routine = await dueRoutine("reuse");
		expect(routine.conversationId).toBeNull();
		const first = await runRoutine(context, { id: routine.id, userId });
		if (first.error) throw first.error;
		await finishOccurrence(first.data.runId, first.data.conversationId);
		await Conversations.deleteSingle({
			where: [{ key: "id", operator: "=", value: first.data.conversationId }],
		});
		const second = await runRoutine(context, { id: routine.id, userId });
		if (second.error) throw second.error;
		expect(second.data.conversationId).not.toBe(first.data.conversationId);
		expect(
			(
				await updateRoutine(context, {
					id: routine.id,
					userId,
					name: "Renamed",
				})
			).data?.conversationId,
		).toBe(second.data.conversationId);
	});
	test("refuses an active or paused target chat without creating another chat", async () => {
		const routine = await dueRoutine("reuse");
		const first = await runRoutine(context, { id: routine.id, userId });
		if (first.error) throw first.error;
		await finishOccurrence(first.data.runId, first.data.conversationId);
		const manual = await startRun(context, {
			conversationId: first.data.conversationId,
			userId,
			text: "Follow up",
			requestId: randomUUID(),
		});
		if (manual.error) throw manual.error;
		expect(
			(await runRoutine(context, { id: routine.id, userId })).error?.status,
		).toBe(409);
		await finishOccurrence(manual.data.runId, first.data.conversationId);
		await Conversations.updateSingle({
			where: [{ key: "id", operator: "=", value: first.data.conversationId }],
			data: { queue_paused: true },
		});
		expect(
			(await runRoutine(context, { id: routine.id, userId })).error?.status,
		).toBe(409);
		expect(await routineRuns(routine.id)).toHaveLength(1);
	});
});

describe("code routines", () => {
	const codeRoutine = async () =>
		(
			await Routines.selectSingle({
				select: ["id", "name", "enabled", "user_id", "source", "next_run_at"],
				where: [
					{ key: "agent_key", operator: "=", value: testAgent.key },
					{ key: "key", operator: "=", value: auditRoutine.key },
				],
			})
		).data;

	test("sync creates, updates and removes them while keeping a pause", async () => {
		expect((await syncAgentRoutines(context)).error).toBeUndefined();
		const created = await codeRoutine();
		expect(created).toMatchObject({
			name: "Weekly audit",
			source: "code",
			user_id: null,
		});
		expect(created?.next_run_at).not.toBeNull();

		await Routines.updateSingle({
			where: [{ key: "id", operator: "=", value: created?.id ?? "" }],
			data: { enabled: false },
		});
		const renamed = {
			...testAgent,
			routines: [
				{
					...auditRoutine,
					name: "Monday audit",
					tools: { collections_list: { requiresApproval: true } },
				},
			],
		};
		await syncAgentRoutines({
			...context,
			config: {
				...context.config,
				ai: {
					...context.config.ai,
					agents: { definitions: [renamed] },
				},
			},
		});
		const updated = await codeRoutine();
		expect(updated).toMatchObject({ id: created?.id, name: "Monday audit" });
		expect(Boolean(updated?.enabled)).toBe(false);
		const id = created?.id ?? "";
		expect((await getRoutineTools(context, [id])).data?.[id]).toEqual({
			collections_list: { requiresApproval: true },
		});
		await syncAgentRoutines(context);
		expect((await getRoutineTools(context, [id])).data?.[id]).toEqual({});

		await syncAgentRoutines({
			...context,
			config: {
				...context.config,
				ai: { ...context.config.ai, agents: { definitions: [] } },
			},
		});
		expect(await codeRoutine()).toBeUndefined();
		expect((await getRoutineTools(context, [id])).data?.[id]).toEqual({});
	});

	test("config sync adopts the latest chat when reuse is enabled and preserves it on later syncs", async () => {
		await syncAgentRoutines(context);
		const stored = await codeRoutine();
		if (!stored) throw new Error("Missing code routine");
		const chat = await insertConversation(context, {
			agentKey: testAgent.key,
			userId: null,
			routineId: stored.id,
		});
		if (chat.error) throw chat.error;
		const config = {
			...context.config,
			ai: {
				...context.config.ai,
				agents: {
					definitions: [
						{
							...testAgent,
							routines: [
								{ ...auditRoutine, conversationMode: "reuse" as const },
							],
						},
					],
				},
			},
		};
		await syncAgentRoutines({ ...context, config });
		await syncAgentRoutines({ ...context, config });
		const current = await Routines.selectSingle({
			select: ["conversation_mode", "conversation_id"],
			where: [{ key: "id", operator: "=", value: stored.id }],
		});
		expect(current.data).toEqual({
			conversation_mode: "reuse",
			conversation_id: chat.data.id,
		});
		await syncAgentRoutines(context);
		expect(
			(
				await Routines.selectSingle({
					select: ["conversation_id"],
					where: [{ key: "id", operator: "=", value: stored.id }],
				})
			).data?.conversation_id,
		).toBeNull();
	});

	test("run as the system in a chat shared with the agent's managers", async () => {
		await syncAgentRoutines(context);
		const routine = await codeRoutine();
		await Routines.updateSingle({
			where: [{ key: "id", operator: "=", value: routine?.id ?? "" }],
			data: { next_run_at: new Date(Date.now() - 60_000).toISOString() },
		});

		expect(await dispatchDueRoutines(context)).toMatchObject({ data: 1 });
		const [run] = await Runs.selectMultiple({
			select: ["id", "user_id", "conversation_id"],
			where: [{ key: "routine_id", operator: "=", value: routine?.id ?? "" }],
		}).then((result) => result.data ?? []);
		expect(run?.user_id).toBeNull();
		expect(enqueueRun).toHaveBeenCalledWith(expect.anything(), {
			runId: run?.id,
			userId: null,
		});
		const AgentConversations = new AgentConversationsRepository(context.db);
		const conversation = await AgentConversations.selectSingleWithLatestRun({
			id: run?.conversation_id ?? "",
		});
		expect(conversation.data?.user_id).toBeNull();
	});
});

describe("run recovery", () => {
	test("requeues an interrupted run, then fails it after repeated attempts", async () => {
		const routine = await dueRoutine();
		await dispatchDueRoutines(context);
		const [run] = await routineRuns(routine.id);
		const runs = new AgentRunsRepository(context.db);
		const interrupt = () =>
			runs.transition({
				runId: run?.id ?? "",
				from: ["queued"],
				status: "interrupted",
				now: new Date().toISOString(),
			});

		for (
			let attempt = 0;
			attempt < constants.agent.limits.recoveries;
			attempt++
		) {
			await interrupt();
			await recoverRuns(context);
			expect((await routineRuns(routine.id))[0]?.status).toBe("queued");
		}
		expect(enqueueRun).toHaveBeenCalledTimes(
			constants.agent.limits.recoveries + 1,
		);

		await interrupt();
		await recoverRuns(context);
		expect((await routineRuns(routine.id))[0]?.status).toBe("failed");
	});
});

vi.mock("../../libs/lucid-remote/services/get-agent-models.js", async () => ({
	default: (
		await import("../../utils/test-helpers/agent-models.js")
	).mockAgentModels(),
}));
