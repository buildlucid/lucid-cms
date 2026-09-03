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
import {
	createJobsContext,
	createTestQueueAdapter,
} from "../../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import { copy } from "../../i18n/index.js";
import { cancelJob } from "../cancel.js";
import defineJob from "../define-job.js";
import { drainJobs } from "../drain.js";
import { enqueueJob, enqueueJobs } from "../enqueue.js";
import { consumeJob } from "./index.js";

const testConfig = getTestConfig();

beforeAll(() => testConfig.migrate());

afterEach(async () => {
	const database = await testConfig.getDatabase();
	await database.client.deleteFrom("lucid_jobs").execute();
});

afterAll(() => testConfig.destroy());

describe("consuming durable jobs", () => {
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
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
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
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
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
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
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
			.selectFrom("lucid_jobs")
			.select(["status", "attempts", "error_message"])
			.where("job_id", "=", enqueued.data.jobId)
			.executeTakeFirstOrThrow();
		expect(stored).toEqual({
			status: "failed",
			attempts: 2,
			error_message: "Expected failure",
		});
	});

	test("asks push transports to retry messages delivered before a job is ready", async () => {
		const job = defineJob({
			name: "test:early-delivery",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(undefined, "test-push"),
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
});
