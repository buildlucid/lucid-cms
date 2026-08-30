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
import type { Config } from "../../types/config.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { copy, createTranslationStore } from "../i18n/index.js";
import createToolkit from "../toolkit/create-toolkit.js";
import defineJob from "./define-job.js";
import { cancelJob } from "./jobs/cancel-job.js";
import { consumeJob } from "./jobs/consume-job.js";
import { drainJobs } from "./jobs/drain-jobs.js";
import { enqueueJob } from "./jobs/enqueue-job.js";
import { enqueueJobs } from "./jobs/enqueue-jobs.js";
import { flushPendingJobs } from "./jobs/flush-pending-jobs.js";
import { recoverExpiredJobs } from "./jobs/recover-expired-jobs.js";
import type {
	AnyJobDefinition,
	QueueAdapterInstance,
	QueueDeliveryMessage,
} from "./types.js";

const testConfig = getTestConfig();

beforeAll(() => testConfig.migrate());

afterEach(async () => {
	const database = await testConfig.getDatabase();
	await database.client.deleteFrom("lucid_queue_jobs").execute();
});

afterAll(() => testConfig.destroy());

const createContext = async (options: {
	jobs: AnyJobDefinition[];
	adapter: QueueAdapterInstance;
}) => {
	const baseConfig = await testConfig.getConfig();
	const config: Config = {
		...baseConfig,
		queue: {
			...baseConfig.queue,
			jobs: options.jobs,
		},
	};
	return createServiceContext({
		config,
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
		queue: options.adapter,
	});
};

const createPullAdapter = (
	publish = vi.fn(async () => undefined),
): QueueAdapterInstance => ({
	type: "queue-adapter",
	key: "test-pull",
	support: { scheduling: true, maxDelayMs: null },
	publish,
});

describe("durable jobs", () => {
	test("binds durable job controls to the toolkit", async () => {
		const job = defineJob({
			name: "test:toolkit",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(),
		});
		const toolkit = createToolkit(context);

		const enqueued = await toolkit.jobs.enqueueJob({
			job,
			payload: { value: 1 },
		});
		if (enqueued.error) throw new Error("Failed to enqueue the test job");
		const cancelled = await toolkit.jobs.cancelJob({
			id: enqueued.data.jobId,
		});
		const enqueuedBatch = await toolkit.jobs.enqueueJobs({
			job,
			payload: [{ value: 2 }, { value: 3 }],
		});
		if (enqueuedBatch.error) throw new Error("Failed to enqueue test jobs");
		const cancelledBatch = await toolkit.jobs.cancelJobs({
			ids: enqueuedBatch.data.map(({ jobId }) => jobId),
		});

		expect(cancelled).toEqual({
			error: undefined,
			data: { type: "cancelled" },
		});
		expect(cancelledBatch).toEqual({
			error: undefined,
			data: [{ type: "cancelled" }, { type: "cancelled" }],
		});
	});

	test("stores validated input and executes a job only once", async () => {
		const handler = vi.fn(async () => {
			await new Promise((resolve) => setTimeout(resolve, 5));
			return { error: undefined, data: undefined };
		});
		const job = defineJob({
			name: "test:execute-once",
			version: 1,
			input: z.object({ value: z.number() }),
			describe: ({ value }) => ({ value }),
			handler,
		});
		const publish = vi.fn(async () => undefined);
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(publish),
		});

		const invalid = await enqueueJob(context, {
			job,
			payload: {
				value: "invalid",
			} as unknown as { value: number },
		});
		expect(invalid.error?.type).toBe("validation");

		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 42 },
		});
		expect(enqueued.error).toBeUndefined();
		if (enqueued.error) return;
		expect(publish).toHaveBeenCalledWith(context, [
			{
				version: 1,
				jobId: enqueued.data.jobId,
				availableAt: expect.any(String),
			},
		]);

		const attempts = await Promise.all([
			consumeJob(context, { jobId: enqueued.data.jobId }),
			consumeJob(context, { jobId: enqueued.data.jobId }),
		]);
		expect(attempts.some((attempt) => attempt.type === "completed")).toBe(true);
		expect(handler).toHaveBeenCalledOnce();

		const stored = await context.db.kysely
			.selectFrom("lucid_queue_jobs")
			.select(["status", "attempts", "payload", "display_data"])
			.where("job_id", "=", enqueued.data.jobId)
			.executeTakeFirstOrThrow();
		expect(stored).toMatchObject({
			status: "completed",
			attempts: 1,
			payload: { value: 42 },
			display_data: { value: 42 },
		});
	});

	test("rejects display data that cannot be stored as JSON", async () => {
		const job = defineJob({
			name: "test:invalid-display-data",
			version: 1,
			input: z.object({ value: z.number() }),
			describe: () => ({ value: Number.NaN }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(),
		});

		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});

		expect(enqueued.error?.type).toBe("validation");
		const stored = await context.db.kysely
			.selectFrom("lucid_queue_jobs")
			.select(({ fn }) => fn.countAll<number>().as("count"))
			.executeTakeFirstOrThrow();
		expect(stored.count).toBe(0);
	});

	test("enforces the global concurrency limit", async () => {
		let active = 0;
		let maximumActive = 0;
		const handler = async () => {
			active += 1;
			maximumActive = Math.max(maximumActive, active);
			await new Promise((resolve) => setTimeout(resolve, 10));
			active -= 1;
			return { error: undefined, data: undefined };
		};
		const job = defineJob({
			name: "test:global-concurrency",
			version: 1,
			input: z.object({}),
			handler,
		});
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(),
		});
		await enqueueJobs(context, {
			job,
			payload: [{}, {}, {}, {}, {}, {}],
		});

		const drained = await drainJobs(context, {
			limit: 10,
			concurrentLimit: 2,
		});

		expect(drained).toMatchObject({
			error: undefined,
			data: { found: 6, processed: 6 },
		});
		expect(maximumActive).toBe(2);
	});

	test("cancels a queued job before its handler starts", async () => {
		const handler = vi.fn(async () => ({ error: undefined, data: undefined }));
		const job = defineJob({
			name: "test:cancel-queued",
			version: 1,
			input: z.object({}),
			handler,
		});
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(),
		});
		const enqueued = await enqueueJob(context, { job, payload: {} });
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		const cancelled = await cancelJob(context, { id: enqueued.data.jobId });
		const consumed = await consumeJob(context, {
			jobId: enqueued.data.jobId,
		});

		expect(cancelled).toEqual({
			error: undefined,
			data: { type: "cancelled" },
		});
		expect(consumed).toEqual({ type: "ignored" });
		expect(handler).not.toHaveBeenCalled();
	});

	test("owns retries and permanent failure handling in core", async () => {
		const onPermanentFailure = vi.fn(async () => undefined);
		const job = defineJob({
			name: "test:retry",
			version: 1,
			input: z.object({ value: z.number() }),
			retry: {
				type: "exponential",
				maxAttempts: 2,
				baseDelayMs: 0,
				maxDelayMs: 0,
				jitter: "none",
			},
			handler: async () => ({
				error: { message: copy.literal("Expected failure") },
				data: undefined,
			}),
			onPermanentFailure,
		});
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(),
		});
		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		const result = await consumeJob(context, {
			jobId: enqueued.data.jobId,
			retry: "immediate",
		});
		expect(result).toEqual({ type: "failed" });
		expect(onPermanentFailure).toHaveBeenCalledOnce();

		const stored = await context.db.kysely
			.selectFrom("lucid_queue_jobs")
			.select(["status", "attempts", "error_message"])
			.where("job_id", "=", enqueued.data.jobId)
			.executeTakeFirstOrThrow();
		expect(stored).toEqual({
			status: "failed",
			attempts: 2,
			error_message: "Expected failure",
		});
	});

	test("recovers an expired final lease as a permanent failure", async () => {
		const onPermanentFailure = vi.fn(async () => undefined);
		const job = defineJob({
			name: "test:expired-lease",
			version: 1,
			input: z.object({ value: z.number() }),
			retry: { type: "none" },
			handler: async () => ({ error: undefined, data: undefined }),
			onPermanentFailure,
		});
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(),
		});
		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		const expiredAt = new Date(Date.now() - 1_000).toISOString();
		await context.db.kysely
			.updateTable("lucid_queue_jobs")
			.set({
				status: "running",
				attempts: 1,
				lease_token: "lost-worker",
				lease_expires_at: expiredAt,
			})
			.where("job_id", "=", enqueued.data.jobId)
			.execute();

		const recovered = await recoverExpiredJobs(context);
		expect(recovered.error).toBeUndefined();
		expect(onPermanentFailure).toHaveBeenCalledOnce();

		const stored = await context.db.kysely
			.selectFrom("lucid_queue_jobs")
			.select(["status", "attempts", "error_message", "lease_token"])
			.where("job_id", "=", enqueued.data.jobId)
			.executeTakeFirstOrThrow();
		expect(stored).toEqual({
			status: "failed",
			attempts: 1,
			error_message: "The job lease expired after its final attempt.",
			lease_token: null,
		});
	});

	test("redelivers an expired push lease through the durable outbox", async () => {
		const job = defineJob({
			name: "test:push-lease-recovery",
			version: 1,
			input: z.object({ value: z.number() }),
			retry: {
				type: "exponential",
				maxAttempts: 2,
				baseDelayMs: 0,
				maxDelayMs: 0,
				jitter: "none",
			},
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const publish = vi.fn(async () => undefined);
		const context = await createContext({
			jobs: [job],
			adapter: {
				type: "queue-adapter",
				key: "test-push",
				support: { scheduling: true, maxDelayMs: null },
				publish,
			},
		});
		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});
		if (enqueued.error) throw new Error("Failed to enqueue the test job");
		publish.mockClear();

		await context.db.kysely
			.updateTable("lucid_queue_jobs")
			.set({
				status: "running",
				attempts: 1,
				lease_token: "lost-push-consumer",
				lease_expires_at: new Date(Date.now() - 1_000).toISOString(),
			})
			.where("job_id", "=", enqueued.data.jobId)
			.execute();

		const recovered = await recoverExpiredJobs(context);
		expect(recovered).toMatchObject({
			error: undefined,
			data: { failed: 0, requeued: 1 },
		});
		await flushPendingJobs(context);
		expect(publish).toHaveBeenCalledOnce();

		const stored = await context.db.kysely
			.selectFrom("lucid_queue_jobs")
			.select(["status", "dispatch_status", "lease_token", "attempts"])
			.where("job_id", "=", enqueued.data.jobId)
			.executeTakeFirstOrThrow();
		expect(stored).toEqual({
			status: "queued",
			dispatch_status: "dispatched",
			lease_token: null,
			attempts: 1,
		});
	});

	test("asks push transports to retry messages delivered before a job is ready", async () => {
		const job = defineJob({
			name: "test:early-delivery",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const context = await createContext({
			jobs: [job],
			adapter: {
				type: "queue-adapter",
				key: "test-push",
				support: { scheduling: true, maxDelayMs: null },
				publish: async () => undefined,
			},
		});
		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
			options: { runAt: new Date(Date.now() + 60_000) },
		});
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		const result = await consumeJob(context, { jobId: enqueued.data.jobId });
		expect(result.type).toBe("retry-transport");
		if (result.type === "retry-transport") {
			expect(result.delayMs).toBeGreaterThan(50_000);
		}
	});

	test("discards both the job and delivery when its service transaction rolls back", async () => {
		const job = defineJob({
			name: "test:rollback",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const publish = vi.fn(async () => undefined);
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(publish),
		});
		let jobId: string | undefined;
		const enqueueThenFail: ServiceFn<[], undefined> = async (service) => {
			const enqueued = await enqueueJob(service, {
				job,
				payload: { value: 1 },
			});
			if (enqueued.error) return enqueued;
			jobId = enqueued.data.jobId;
			return {
				error: { message: copy.literal("Roll back") },
				data: undefined,
			};
		};

		const result = await serviceWrapper(enqueueThenFail, {
			transaction: true,
		})(context);
		expect(result.error).toBeDefined();
		expect(publish).not.toHaveBeenCalled();
		expect(jobId).toBeDefined();
		const stored = await context.db.kysely
			.selectFrom("lucid_queue_jobs")
			.select("job_id")
			.where("job_id", "=", jobId ?? "")
			.executeTakeFirst();
		expect(stored).toBeUndefined();
	});

	test("delivers only after a committed job is visible", async () => {
		const job = defineJob({
			name: "test:commit",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const publish = vi.fn(
			async (
				publishedContext: ServiceContext,
				messages: readonly QueueDeliveryMessage[],
			) => {
				const stored = await publishedContext.db.kysely
					.selectFrom("lucid_queue_jobs")
					.select("job_id")
					.where("job_id", "=", messages[0]?.jobId ?? "")
					.executeTakeFirst();
				expect(stored).toBeDefined();
			},
		);
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(publish),
		});
		const enqueue: ServiceFn<[], undefined> = async (service) => {
			const result = await enqueueJob(service, {
				job,
				payload: { value: 1 },
			});
			return result.error ? result : { error: undefined, data: undefined };
		};

		const result = await serviceWrapper(enqueue, { transaction: true })(
			context,
		);
		expect(result.error).toBeUndefined();
		expect(publish).toHaveBeenCalledOnce();
	});

	test("keeps jobs pending when transport delivery fails", async () => {
		const job = defineJob({
			name: "test:outbox",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const context = await createContext({
			jobs: [job],
			adapter: createPullAdapter(async () => {
				throw new Error("Transport unavailable");
			}),
		});

		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});
		expect(enqueued.error).toBeUndefined();
		if (enqueued.error) return;
		const stored = await context.db.kysely
			.selectFrom("lucid_queue_jobs")
			.select(["dispatch_status", "dispatch_attempts", "dispatch_error"])
			.where("job_id", "=", enqueued.data.jobId)
			.executeTakeFirstOrThrow();
		expect(stored).toEqual({
			dispatch_status: "pending",
			dispatch_attempts: 1,
			dispatch_error: "Transport unavailable",
		});
	});
});
