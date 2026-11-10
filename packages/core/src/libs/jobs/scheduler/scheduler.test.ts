import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import z from "zod";
import getSchedules from "../../../services/jobs/get-schedules.js";
import setScheduleState from "../../../services/jobs/set-schedule-state.js";
import triggerSchedule from "../../../services/jobs/trigger-schedule.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import { copy, createTranslationStore } from "../../i18n/index.js";
import inlineQueueAdapter from "../../queue/adapters/inline.js";
import type {
	QueueAdapterInstance,
	QueueDeliveryMessage,
} from "../../queue/types.js";
import setupJobScheduler from "../../runtime/setup-job-scheduler.js";
import { consumeJob } from "../consume/index.js";
import defineJob from "../define-job.js";
import type { AnyJobDefinition } from "../types.js";
import runJobScheduler from "./index.js";
import { resolveRegisteredJobSchedule } from "./registered-schedules.js";

const testConfig = getTestConfig();

beforeAll(() => testConfig.migrate());

afterEach(async () => {
	const database = await testConfig.getDatabase();
	await database.client.deleteFrom("lucid_job_schedule_overrides").execute();
	await database.client.deleteFrom("lucid_job_scheduler").execute();
	await database.client.deleteFrom("lucid_jobs").execute();
});

afterAll(() => testConfig.destroy());

const createPullAdapter = (
	publish = vi.fn(
		async (_messages: readonly QueueDeliveryMessage[]) => undefined,
	),
): QueueAdapterInstance => ({
	type: "queue-adapter",
	key: "scheduler-test",
	support: { delayedDelivery: true, maxDelayMs: null },
	publish: async (_context, messages) => {
		await publish(messages);
		return { error: undefined, data: undefined };
	},
});

const createContext = async (options: {
	jobs: AnyJobDefinition[];
	adapter?: QueueAdapterInstance;
}) => {
	const baseConfig = await testConfig.getConfig();
	const config: ResolvedLucidConfig = {
		...baseConfig,
		jobs: options.jobs,
	};
	return createServiceContext({
		config,
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
		queue: options.adapter ?? createPullAdapter(),
	});
};

describe("job schedules", () => {
	test("enqueues each occurrence once and exposes its trigger to the handler", async () => {
		const handler = vi.fn(async () => {});
		const job = defineJob({
			key: "test:scheduled-job",
			version: 1,
			input: z.object({ value: z.number() }),
			schedules: [
				{
					key: "every-minute",
					cron: "* * * * *",
					input: { value: 42 },
				},
			],
			handler,
		});
		const context = await createContext({ jobs: [job] });
		const scheduledAt = new Date("2026-08-30T09:15:00.000Z");

		const first = await runJobScheduler(context, scheduledAt);
		const duplicate = await runJobScheduler(context, scheduledAt);
		expect(first.error).toBeUndefined();
		expect(duplicate.error).toBeUndefined();

		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select(["job_id", "schedule_key", "scheduled_for"])
			.executeTakeFirstOrThrow();
		expect(stored.schedule_key).toBe("test:scheduled-job/every-minute");
		expect(new Date(stored.scheduled_for ?? 0).toISOString()).toBe(
			scheduledAt.toISOString(),
		);

		await consumeJob(context, { jobId: stored.job_id });
		expect(handler).toHaveBeenCalledWith({
			context,
			input: { value: 42 },
			execution: expect.objectContaining({
				trigger: {
					type: "schedule",
					scheduleKey: "test:scheduled-job/every-minute",
					scheduledFor: scheduledAt.toISOString(),
				},
			}),
			toolkit: expect.objectContaining({ jobs: expect.any(Object) }),
		});

		const counts = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select(({ fn }) => fn.countAll<number>().as("count"))
			.executeTakeFirstOrThrow();
		expect(counts.count).toBe(1);
	});

	test("skips an overlapping schedule without creating another job", async () => {
		const job = defineJob({
			key: "test:no-overlap",
			version: 1,
			input: z.object({}),
			schedules: [
				{
					key: "every-minute",
					cron: "* * * * *",
					input: {},
					overlap: "skip",
				},
			],
			handler: async () => {},
		});
		const context = await createContext({ jobs: [job] });

		const first = await runJobScheduler(
			context,
			new Date("2026-08-30T09:15:00.000Z"),
		);
		const skipped = await runJobScheduler(
			context,
			new Date("2026-08-30T09:16:00.000Z"),
		);
		expect(first.error).toBeUndefined();
		expect(skipped.error).toBeUndefined();

		const jobs = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select(({ fn }) => fn.countAll<number>().as("count"))
			.executeTakeFirstOrThrow();
		expect(jobs.count).toBe(1);
	});

	test("runs scheduled jobs through the inline adapter when no external queue exists", async () => {
		const handler = vi.fn(async () => {});
		const job = defineJob({
			key: "test:inline-schedule",
			version: 1,
			input: z.null(),
			schedules: [
				{
					key: "every-minute",
					cron: "* * * * *",
					input: null,
				},
			],
			handler,
		});
		const context = await createContext({
			jobs: [job],
			adapter: inlineQueueAdapter(),
		});

		const result = await setupJobScheduler().run(context, {
			scheduledAt: new Date("2026-08-30T09:15:00.000Z"),
		});

		expect(result.error).toBeUndefined();
		expect(handler).toHaveBeenCalledOnce();
		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select("status")
			.executeTakeFirstOrThrow();
		expect(stored.status).toBe("completed");
	});

	test("leaves an inline retry queued until a scheduler tick after its backoff", async () => {
		let attempts = 0;
		const job = defineJob({
			key: "test:inline-retry",
			version: 1,
			input: z.null(),
			retry: {
				type: "exponential",
				maxAttempts: 2,
				baseDelayMs: 30_000,
				maxDelayMs: 30_000,
				jitter: "none",
			},
			schedules: [{ key: "every-minute", cron: "* * * * *", input: null }],
			handler: async () => {
				attempts += 1;
				if (attempts === 1) {
					throw new LucidError({ message: copy.literal("Expected failure") });
				}
				return;
			},
		});
		const context = await createContext({
			jobs: [job],
			adapter: inlineQueueAdapter(),
		});
		const scheduledAt = new Date("2026-08-30T09:15:00.000Z");

		vi.useFakeTimers({ toFake: ["Date"] });
		try {
			await setupJobScheduler().run(context, { scheduledAt });
			expect(attempts).toBe(1);
			const waiting = await context.db.kysely
				.selectFrom("lucid_jobs")
				.select("status")
				.executeTakeFirstOrThrow();
			expect(waiting.status).toBe("queued");

			vi.setSystemTime(Date.now() + 31_000);
			await setupJobScheduler().run(context, { scheduledAt });
		} finally {
			vi.useRealTimers();
		}

		expect(attempts).toBe(2);
		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select("status")
			.executeTakeFirstOrThrow();
		expect(stored.status).toBe("completed");
	});

	test("manually triggers a registered schedule without moving the scheduler cursor", async () => {
		const job = defineJob({
			key: "test:manual-schedule",
			version: 1,
			input: z.object({ value: z.number() }),
			schedules: [
				{
					key: "nightly",
					cron: "0 0 * * *",
					input: { value: 7 },
				},
			],
			handler: async () => {},
		});
		const context = await createContext({ jobs: [job] });

		const result = await triggerSchedule(context, {
			scheduleKey: "test:manual-schedule/nightly",
		});
		expect(result.error).toBeUndefined();
		if (result.error) return;
		const overlapping = await triggerSchedule(context, {
			scheduleKey: "test:manual-schedule/nightly",
		});
		expect(overlapping.error?.status).toBe(409);

		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select(["created_by_user_id", "schedule_key", "trigger_type"])
			.executeTakeFirstOrThrow();
		expect(stored).toMatchObject({
			created_by_user_id: null,
			schedule_key: "test:manual-schedule/nightly",
			trigger_type: "schedule",
		});
		const cursor = await context.db.kysely
			.selectFrom("lucid_job_scheduler")
			.select("cursor_at")
			.executeTakeFirst();
		expect(cursor).toBeUndefined();

		const schedules = await getSchedules(context, {
			query: {
				filter: undefined,
				filterOr: undefined,
				sort: undefined,
				page: 1,
				perPage: 10,
			},
		});
		expect(schedules.error).toBeUndefined();
		if (schedules.error) return;
		expect(schedules.data.data[0]).toMatchObject({
			key: "test:manual-schedule/nightly",
			cron: "0 0 * * *",
			timezone: "UTC",
			lastRun: {
				jobId: result.data.jobId,
				status: "queued",
				attempts: 0,
			},
		});
	});

	test("skips paused schedules and resumes without replaying missed minutes", async () => {
		const job = defineJob({
			key: "test:paused-schedule",
			version: 1,
			input: z.object({}),
			schedules: [
				{
					key: "every-minute",
					cron: "* * * * *",
					input: {},
				},
			],
			handler: async () => {},
		});
		const context = await createContext({ jobs: [job] });
		const scheduleKey = "test:paused-schedule/every-minute";

		const paused = await setScheduleState(context, {
			scheduleKey,
			state: "paused",
		});
		expect(paused.error).toBeUndefined();
		await runJobScheduler(context, new Date("2026-08-30T09:15:00.000Z"));

		const whilePaused = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select(({ fn }) => fn.countAll<number>().as("count"))
			.executeTakeFirstOrThrow();
		expect(whilePaused.count).toBe(0);

		const resumed = await setScheduleState(context, {
			scheduleKey,
			state: "active",
		});
		expect(resumed.error).toBeUndefined();
		await runJobScheduler(context, new Date("2026-08-30T09:16:00.000Z"));

		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select("scheduled_for")
			.executeTakeFirstOrThrow();
		expect(new Date(stored.scheduled_for ?? 0).toISOString()).toBe(
			"2026-08-30T09:16:00.000Z",
		);
	});
});

describe("resolveRegisteredJobSchedule", () => {
	const job = defineJob({
		key: "test:generate-report",
		version: 1,
		input: z.object({ type: z.string() }),
		schedules: [
			{ key: "daily", cron: "0 0 * * *", input: { type: "summary" } },
			{ key: "weekly", cron: "0 0 * * 1", input: { type: "full" } },
		],
		handler: async () => {},
	});
	const schedules = job.schedules.map((schedule) => ({
		key: `${job.key}/${schedule.key}`,
		job,
		schedule,
	}));

	test("resolves an exact schedule key", () => {
		expect(
			resolveRegisteredJobSchedule(schedules, "test:generate-report/weekly")
				?.schedule.key,
		).toBe("weekly");
	});

	test("uses the first schedule when given a job key", () => {
		expect(
			resolveRegisteredJobSchedule(schedules, "test:generate-report")?.schedule
				.key,
		).toBe("daily");
	});

	test("returns undefined for an unknown reference", () => {
		expect(
			resolveRegisteredJobSchedule(schedules, "test:unknown"),
		).toBeUndefined();
	});
});
