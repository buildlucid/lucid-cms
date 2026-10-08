import { randomUUID } from "node:crypto";
import { sql } from "kysely";
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
import { jobFailedNotification } from "../../../services/jobs/notifications/job-failed.js";
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
import { recoverExpiredJobs } from "../maintenance.js";
import { consumeJob } from "./index.js";

const testConfig = getTestConfig();

beforeAll(() => testConfig.migrate());

afterEach(async () => {
	const database = await testConfig.getDatabase();
	await database.client.deleteFrom("lucid_jobs").execute();
	await database.client.deleteFrom("lucid_notifications").execute();
});

afterAll(() => testConfig.destroy());

describe("consuming durable jobs", () => {
	test("commits transactional work and completion before recovering an expired lease", async () => {
		const started = Promise.withResolvers<void>();
		const finish = Promise.withResolvers<void>();
		const onPermanentFailure = vi.fn(async () => undefined);
		let executions = 0;
		const job = defineJob({
			name: "test:transaction-expired-lease",
			version: 1,
			input: z.object({}),
			transaction: true,
			retry: { type: "none" },
			handler: async ({ context, execution }) => {
				executions += 1;
				expect(context.db.isTransaction).toBe(true);
				await context.db.kysely
					.updateTable("lucid_jobs")
					.set({ display_data: { worked: true } })
					.where("job_id", "=", execution.jobId)
					.execute();
				started.resolve();
				await finish.promise;
				return { error: undefined, data: undefined };
			},
			onPermanentFailure,
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
		});
		const enqueued = await enqueueJob(context, { job, payload: {} });
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		vi.useFakeTimers({ toFake: ["Date"] });
		const consuming = consumeJob(context, { jobId: enqueued.data.jobId });
		try {
			await started.promise;
			vi.setSystemTime(Date.now() + 90_000);
			const recovering = recoverExpiredJobs(context);
			const duplicate = consumeJob(context, { jobId: enqueued.data.jobId });
			finish.resolve();

			expect(await consuming).toEqual({ type: "completed" });
			expect(await recovering).toMatchObject({
				error: undefined,
				data: { failed: 0, requeued: 0 },
			});
			expect(await duplicate).toEqual({ type: "ignored" });
			expect(executions).toBe(1);
			expect(onPermanentFailure).not.toHaveBeenCalled();

			const stored = await context.db.kysely
				.selectFrom("lucid_jobs")
				.select(["status", "attempts", "display_data", "lease_token"])
				.where("job_id", "=", enqueued.data.jobId)
				.executeTakeFirstOrThrow();
			expect(stored).toEqual({
				status: "completed",
				attempts: 1,
				display_data: { worked: true },
				lease_token: null,
			});
		} finally {
			finish.resolve();
			await consuming;
			vi.useRealTimers();
		}
	});

	test("rolls back a transactional handler before recording permanent failure", async () => {
		const cause = new Error("Expected diagnostic context");
		let failureHandled = false;
		const job = defineJob({
			name: "test:transaction-handler-failure",
			version: 1,
			input: z.object({}),
			transaction: true,
			retry: { type: "none" },
			handler: async ({ context, execution }) => {
				await context.db.kysely
					.updateTable("lucid_jobs")
					.set({ display_data: { worked: true } })
					.where("job_id", "=", execution.jobId)
					.execute();
				return {
					error: {
						message: copy.literal("Expected transaction failure"),
						cause,
					},
					data: undefined,
				};
			},
			onPermanentFailure: async ({ context, failure }) => {
				expect(failure.error?.cause).toBe(cause);
				expect(context.db.isTransaction).toBe(false);
				const stored = await context.db.kysely
					.selectFrom("lucid_jobs")
					.select(["status", "display_data"])
					.where("job_id", "=", failure.jobId)
					.executeTakeFirstOrThrow();
				expect(stored).toEqual({ status: "failed", display_data: null });
				failureHandled = true;
			},
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
		});
		const enqueued = await enqueueJob(context, { job, payload: {} });
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		expect(await consumeJob(context, { jobId: enqueued.data.jobId })).toEqual({
			type: "failed",
		});
		expect(failureHandled).toBe(true);
	});

	test("rolls back transactional work when the completion write fails", async () => {
		const job = defineJob({
			name: "test:transaction-completion-failure",
			version: 1,
			input: z.object({}),
			transaction: true,
			handler: async ({ context, execution }) => {
				await context.db.kysely
					.updateTable("lucid_jobs")
					.set({ display_data: { worked: true } })
					.where("job_id", "=", execution.jobId)
					.execute();
				return { error: undefined, data: undefined };
			},
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
		});
		const enqueued = await enqueueJob(context, { job, payload: {} });
		if (enqueued.error) throw new Error("Failed to enqueue the test job");

		await sql`create trigger reject_job_completion
			before update of status on lucid_jobs
			when new.status = 'completed'
			begin
				select raise(abort, 'Expected completion failure');
			end`.execute(context.db.kysely);
		try {
			expect(await consumeJob(context, { jobId: enqueued.data.jobId })).toEqual(
				{
					type: "retry-transport",
				},
			);
			const stored = await context.db.kysely
				.selectFrom("lucid_jobs")
				.select(["status", "attempts", "display_data"])
				.where("job_id", "=", enqueued.data.jobId)
				.executeTakeFirstOrThrow();
			expect(stored).toEqual({
				status: "running",
				attempts: 1,
				display_data: null,
			});
		} finally {
			await sql`drop trigger reject_job_completion`.execute(context.db.kysely);
		}
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
			maxConcurrentJobs: 2,
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
		expect(onPermanentFailure).toHaveBeenCalledWith({
			context,
			failure: {
				jobId: enqueued.data.jobId,
				input: { value: 1 },
				attempts: 2,
				errorMessage: "Expected failure",
				error: { message: copy.literal("Expected failure") },
			},
			toolkit: expect.objectContaining({ jobs: expect.any(Object) }),
		});

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

	test("stores a thrown error's stack and notifies until the job next completes", async () => {
		const job = defineJob({
			name: "test:thrown-failure",
			version: 1,
			input: z.object({ fail: z.boolean() }),
			retry: { type: "none" },
			handler: async ({ input }) => {
				if (input.fail) throw new Error("Expected crash");
				return { error: undefined, data: undefined };
			},
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
		});
		await context.db.kysely
			.insertInto("lucid_users")
			.values({
				email: `${randomUUID()}@example.test`,
				username: randomUUID(),
				secret: "test",
				super_admin: true,
			})
			.execute();
		const notification = () =>
			context.db.kysely
				.selectFrom("lucid_notifications")
				.select(["key", "resolved_at"])
				.where("type", "=", jobFailedNotification.key)
				.executeTakeFirst();

		const failing = await enqueueJob(context, {
			job,
			payload: { fail: true },
		});
		if (failing.error) throw new Error("Failed to enqueue the test job");

		expect(await consumeJob(context, { jobId: failing.data.jobId })).toEqual({
			type: "failed",
		});
		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select(["error_message", "error_stack"])
			.where("job_id", "=", failing.data.jobId)
			.executeTakeFirstOrThrow();
		expect(stored.error_message).toBe("Expected crash");
		expect(stored.error_stack).toContain("Error: Expected crash");
		expect(await notification()).toEqual({
			key: "job:test:thrown-failure:failed",
			resolved_at: null,
		});

		const passing = await enqueueJob(context, {
			job,
			payload: { fail: false },
		});
		if (passing.error) throw new Error("Failed to enqueue the test job");

		expect(await consumeJob(context, { jobId: passing.data.jobId })).toEqual({
			type: "completed",
		});
		expect((await notification())?.resolved_at).not.toBeNull();
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
