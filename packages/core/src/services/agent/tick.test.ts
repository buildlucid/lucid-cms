import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import defineAgent from "../../libs/agent/define-agent.js";
import Migration00000014 from "../../libs/db/migrations/00000014-agent.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import runJobScheduler from "../../libs/jobs/scheduler/index.js";
import {
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createRoutine from "./create-routine.js";
import dispatchDueRoutines from "./dispatch-due-routines.js";
import { agentTickJob } from "./jobs/tick.js";

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
const testAgent = defineAgent({
	key: "tick-test",
	name: "Tick Agent",
	description: "Waits for work.",
	tools: [],
});

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
		config: {
			...config,
			ai: { ...config.ai, agents: [testAgent] },
			jobs: [agentTickJob],
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
				email: "tick@example.test",
				username: "tick",
				secret: "test",
			})
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
});
afterAll(() => testConfig.destroy());

const hasWork = async () => {
	const Runs = new AgentRunsRepository(context.db);
	const work = await Runs.hasTickWork({ now: new Date().toISOString() });
	if (work.error) throw new Error(JSON.stringify(work.error));
	return work.data;
};

describe("the agent tick's check", () => {
	test("finds work only while a routine is due, a run is unfinished or changes wait for a routine", async () => {
		expect(await hasWork()).toBe(false);

		const routine = await createRoutine(context, {
			conversationMode: "new",
			agentKey: testAgent.key,
			userId,
			name: "Daily review",
			instructions: "Review today's changes.",
			schedule: { cron: "0 9 * * *", timezone: "UTC" },
			events: [],
			enabled: true,
		});
		if (routine.error) throw new Error(JSON.stringify(routine.error));
		const Routines = new AgentRoutinesRepository(context.db);
		await Routines.updateSingle({
			where: [{ key: "id", operator: "=", value: routine.data.id }],
			data: { next_run_at: new Date(Date.now() - 60_000).toISOString() },
		});
		expect(await hasWork()).toBe(true);

		//* starting it moves the routine to its next occurrence and leaves a queued run
		expect(await dispatchDueRoutines(context)).toMatchObject({ data: 1 });
		expect(await hasWork()).toBe(true);

		const Runs = new AgentRunsRepository(context.db);
		const runs = await Runs.selectMultiple({
			select: ["id"],
			where: [{ key: "routine_id", operator: "=", value: routine.data.id }],
		});
		await Runs.transition({
			runId: runs.data?.[0]?.id ?? "",
			from: ["queued"],
			status: "completed",
			now: new Date().toISOString(),
		});
		expect(await hasWork()).toBe(false);

		const now = new Date().toISOString();
		await context.db.kysely
			.insertInto("lucid_agent_routine_pending")
			.values({
				id: randomUUID(),
				routine_id: routine.data.id,
				event: "documents.afterUpsert",
				subject_type: "document",
				subject_id: 1,
				subject_key: "page:1",
				fields: [],
				first_at: now,
				last_at: now,
			})
			.execute();
		expect(await hasWork()).toBe(true);

		await context.db.kysely.deleteFrom("lucid_agent_routine_pending").execute();
	});

	test("stores no tick job in a minute with nothing in flight", async () => {
		const ticked = await runJobScheduler(context, new Date());
		expect(ticked.error).toBeUndefined();

		const jobs = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select("job_id")
			.where("job_key", "=", agentTickJob.key)
			.execute();
		expect(jobs).toEqual([]);
	});
});
