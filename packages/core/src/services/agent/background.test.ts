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
import Migration00000014 from "../../libs/db/migrations/00000014-agent.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import {
	AgentConversationsRepository,
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createRoutine from "./create-routine.js";
import dispatchDueRoutines from "./dispatch-due-routines.js";
import enqueueRun from "./helpers/enqueue-run.js";
import recoverRuns from "./recover-runs.js";

vi.mock("./helpers/check-agent-access.js", () => ({
	default: vi.fn(async (_context, input) => ({
		error: undefined,
		data: { userId: input.userId, permissions: [], superAdmin: false },
	})),
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

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	const database = await testConfig.getDatabase();
	const tables = await database.client.introspection.getTables();
	if (!tables.some((table) => table.name === "lucid_agent_runs")) {
		await Migration00000014(config.db).up(database.client);
	}
	context = createServiceContext({
		config,
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

const dueRoutine = async () => {
	const routine = await createRoutine(context, {
		userId,
		title: "Daily review",
		instructions: "Review today's changes.",
		cron: "0 9 * * *",
		timezone: "UTC",
		enabled: true,
	});
	if (routine.error) throw new Error(JSON.stringify(routine.error));
	await new AgentRoutinesRepository(context.db).updateSingle({
		where: [{ key: "id", operator: "=", value: routine.data.id }],
		data: { next_run_at: new Date(Date.now() - 60_000).toISOString() },
	});
	return routine.data;
};
const routineRuns = async (routineId: string) =>
	(
		await new AgentRunsRepository(context.db).selectMultiple({
			select: ["id", "status", "checkpoint", "conversation_id"],
			where: [{ key: "routine_id", operator: "=", value: routineId }],
		})
	).data ?? [];
const nextRunAt = async (routineId: string) =>
	(
		await new AgentRoutinesRepository(context.db).selectSingle({
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
		const conversation = await new AgentConversationsRepository(
			context.db,
		).selectSingleForUser({ id: run?.conversation_id ?? "", userId });
		expect(conversation.data?.routine_id).toBe(routine.id);
		expect(
			new Date(String(await nextRunAt(routine.id))).getTime(),
		).toBeGreaterThan(Date.now());
	});

	test("silently skips an occurrence while the previous run is unfinished", async () => {
		const routine = await dueRoutine();
		await dispatchDueRoutines(context);
		const [run] = await routineRuns(routine.id);
		await new AgentRunsRepository(context.db).transition({
			runId: run?.id ?? "",
			from: ["queued"],
			status: "waiting",
			now: new Date().toISOString(),
		});
		await new AgentRoutinesRepository(context.db).updateSingle({
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
		await new AgentRunsRepository(context.db).updateSingle({
			where: [{ key: "id", operator: "=", value: first?.id ?? "" }],
			data: {
				status: "completed",
				summary: "Found two broken links.",
				finished_at: new Date().toISOString(),
			},
		});
		await new AgentRoutinesRepository(context.db).updateSingle({
			where: [{ key: "id", operator: "=", value: routine.id }],
			data: { next_run_at: new Date(Date.now() - 60_000).toISOString() },
		});

		await dispatchDueRoutines(context);
		const second = (await routineRuns(routine.id)).find(
			(run) => run.id !== first?.id,
		);
		//* added once the run has loaded the routine's history
		expect(second?.checkpoint?.extraContext).toContain(
			"Found two broken links.",
		);
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
