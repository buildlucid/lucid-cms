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
} from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import defineJob from "./define-job.js";
import { flushPendingJobs } from "./dispatch.js";
import { enqueueJob } from "./enqueue.js";
import { recoverExpiredJobs } from "./maintenance.js";

const testConfig = getTestConfig();

beforeAll(() => testConfig.migrate());

afterEach(async () => {
	const database = await testConfig.getDatabase();
	await database.client.deleteFrom("lucid_jobs").execute();
});

afterAll(() => testConfig.destroy());

describe("recovering expired job leases", () => {
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
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
		});
		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		await context.db.kysely
			.updateTable("lucid_jobs")
			.set({
				status: "running",
				attempts: 1,
				lease_token: "lost-worker",
				lease_expires_at: new Date(Date.now() - 1_000).toISOString(),
			})
			.where("job_id", "=", enqueued.data.jobId)
			.execute();

		const recovered = await recoverExpiredJobs(context);
		expect(recovered.error).toBeUndefined();
		expect(onPermanentFailure).toHaveBeenCalledOnce();

		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
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
		const publish = vi.fn(async () => ({ error: undefined, data: undefined }));
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(publish, "test-push"),
		});
		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});
		if (enqueued.error) throw new Error("Failed to enqueue the test job");
		publish.mockClear();

		await context.db.kysely
			.updateTable("lucid_jobs")
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
			.selectFrom("lucid_jobs")
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
});
