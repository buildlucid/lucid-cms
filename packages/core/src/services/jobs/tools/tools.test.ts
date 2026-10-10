import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import z from "zod";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import defineJob from "../../../libs/jobs/define-job.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import createToolkit from "../../../libs/toolkit/create-toolkit.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import { agentTools } from "../../../libs/tools/lucid-tools.js";
import type { AgentToolDefinition } from "../../../libs/tools/types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import syncLocales from "../../sync/sync-locales.js";
import { outputSchema as findOutputSchema } from "./find/schema.js";
import { outputSchema as getOutputSchema } from "./get/schema.js";
import { outputSchema as schedulesOutputSchema } from "./list-schedules/schema.js";

const fixture = getTestConfig();
const tidyJob = defineJob({
	name: "test:tidy",
	version: 1,
	input: z.object({ reason: z.string() }),
	schedules: [
		{ name: "nightly", cron: "0 3 * * *", input: { reason: "nightly" } },
	],
	handler: async () => ({ error: undefined, data: undefined }),
});

let context: ServiceContext;
let operator: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: { ...config, jobs: { ...config.jobs, definitions: [tidyJob] } },
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();

	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	operator = user.id;
});
afterAll(() => fixture.destroy());

/** Calls an agent tool for a person, with the run's permissions limited to the given ones. */
const callAgent = (
	tool: AgentToolDefinition,
	input: unknown,
	permissions: string[] = [Permissions.JobsRead],
) => {
	const runId = randomUUID();
	return executeAgentTool({
		context,
		tool,
		input,
		execution: {
			authority: {
				principal: { type: "user", userId: operator },
				permissions,
				superAdmin: false,
			},
			actor: { kind: "user", userId: operator, agentRunId: runId },
			signal: AbortSignal.timeout(10_000),
			operationId: `${runId}:${randomUUID()}`,
			run: {
				id: runId,
				conversationId: randomUUID(),
				userId: operator,
				agentKey: "test",
			},
		},
	});
};

test("finds jobs by name and reads one by its public ID with its stack trace", async () => {
	const enqueued = await createToolkit(context).jobs.enqueueJob({
		job: tidyJob,
		payload: { reason: "manual" },
	});
	assert(enqueued.data, JSON.stringify(enqueued.error));

	const found = await callAgent(agentTools.findJobs(), {
		query: { filter: [{ key: "jobName", value: tidyJob.name }] },
	});
	assert(found.type === "success", JSON.stringify(found));
	const jobs = findOutputSchema.parse(found.data.output).data;
	expect(jobs.map((job) => job.jobId)).toContain(enqueued.data.jobId);
	expect(jobs[0]).not.toHaveProperty("queueAdapterKey");
	expect(jobs[0]).not.toHaveProperty("errorStack");

	const read = await callAgent(agentTools.getJob(), {
		jobId: enqueued.data.jobId,
	});
	assert(read.type === "success", JSON.stringify(read));
	expect(getOutputSchema.parse(read.data.output).data).toMatchObject({
		jobId: enqueued.data.jobId,
		jobName: tidyJob.name,
		errorStack: null,
	});

	expect(
		await callAgent(agentTools.getJob(), { jobId: randomUUID() }),
	).toMatchObject({ type: "failed" });
	expect(await callAgent(agentTools.getJob(), { jobId: "3b? " })).toMatchObject(
		{ type: "invalid-input" },
	);
	expect(await callAgent(agentTools.findJobs(), {}, [])).toMatchObject({
		type: "forbidden",
	});
});

test("lists schedules and runs one early after approval, attributing the job to the person", async () => {
	const listed = await callAgent(agentTools.listJobSchedules(), {});
	assert(listed.type === "success", JSON.stringify(listed));
	const schedules = schedulesOutputSchema.parse(listed.data.output).data;
	expect(schedules).toEqual([
		expect.objectContaining({
			key: `${tidyJob.name}/nightly`,
			cron: "0 3 * * *",
			state: "active",
		}),
	]);

	const run = agentTools.runJobSchedule();
	expect(run.requiresApproval).toBe(true);
	const ran = await callAgent(run, { scheduleKey: `${tidyJob.name}/nightly` }, [
		Permissions.JobsRun,
	]);
	assert(ran.type === "success", JSON.stringify(ran));
	expect(ran.data.output).toMatchObject({
		job: { jobId: expect.any(String), name: tidyJob.name, version: 1 },
	});

	const read = await callAgent(agentTools.getJob(), {
		jobId: ran.data.output.job.jobId,
	});
	assert(read.type === "success", JSON.stringify(read));
	expect(getOutputSchema.parse(read.data.output).data).toMatchObject({
		scheduleKey: `${tidyJob.name}/nightly`,
		triggerType: "schedule",
		createdByUserId: operator,
	});

	expect(
		await callAgent(run, { scheduleKey: "test:missing/never" }, [
			Permissions.JobsRun,
		]),
	).toMatchObject({ type: "failed" });
	expect(
		await callAgent(run, { scheduleKey: `${tidyJob.name}/nightly` }),
	).toMatchObject({ type: "forbidden" });
});
