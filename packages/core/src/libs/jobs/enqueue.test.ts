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
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import {
	createJobsContext,
	createTestQueueAdapter,
} from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import executeHooks from "../hooks/execute-hooks.js";
import { copy } from "../i18n/index.js";
import type { QueueDeliveryMessage } from "../queue/types.js";
import createToolkit from "../toolkit/create-toolkit.js";
import { consumeJob } from "./consume/index.js";
import defineJob from "./define-job.js";
import { enqueueJob } from "./enqueue.js";

const testConfig = getTestConfig();

beforeAll(() => testConfig.migrate());

afterEach(async () => {
	const database = await testConfig.getDatabase();
	await database.client.deleteFrom("lucid_jobs").execute();
});

afterAll(() => testConfig.destroy());

describe("enqueueing durable jobs", () => {
	test("binds durable job controls to the toolkit", async () => {
		const job = defineJob({
			name: "test:toolkit",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
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
		const publish = vi.fn(async () => ({ error: undefined, data: undefined }));
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(publish),
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
			.selectFrom("lucid_jobs")
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
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
		});

		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});

		expect(enqueued.error?.type).toBe("validation");
		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select(({ fn }) => fn.countAll<number>().as("count"))
			.executeTakeFirstOrThrow();
		expect(stored.count).toBe(0);
	});

	test("discards both the job and delivery when its service transaction rolls back", async () => {
		const job = defineJob({
			name: "test:rollback",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const publish = vi.fn(async () => ({ error: undefined, data: undefined }));
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(publish),
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
			.selectFrom("lucid_jobs")
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
					.selectFrom("lucid_jobs")
					.select("job_id")
					.where("job_id", "=", messages[0]?.jobId ?? "")
					.executeTakeFirst();
				expect(stored).toBeDefined();
				return { error: undefined, data: undefined };
			},
		);
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(publish),
		});
		const enqueue: ServiceFn<[], undefined> = async (service) => {
			const result = await enqueueJob(service, {
				job,
				payload: { value: 1 },
			});
			return result.error ? result : { error: undefined, data: undefined };
		};

		const result = await serviceWrapper(enqueue, {
			transaction: true,
		})(context);
		expect(result.error).toBeUndefined();
		expect(publish).toHaveBeenCalledOnce();
	});

	test.each([
		false,
		true,
	])("keeps jobs enqueued by hook toolkits in their transaction (rollback: %s)", async (rollback) => {
		const job = defineJob({
			name: "test:hook-transaction",
			version: 1,
			input: z.object({ id: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const publish = vi.fn(async () => ({ error: undefined, data: undefined }));
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(publish),
		});
		let jobId: string | undefined;
		context.config.hooks = [
			{
				service: "media",
				event: "afterRestore",
				handler: async ({ context: hookContext, toolkit, data }) => {
					expect(hookContext.db.isTransaction).toBe(true);
					const enqueued = await toolkit.jobs.enqueueJob({
						job,
						payload: { id: data.ids[0] ?? 0 },
					});
					if (enqueued.error) return enqueued;

					jobId = enqueued.data.jobId;
					expect(publish).not.toHaveBeenCalled();
					return rollback
						? { error: { message: copy.literal("Roll back") }, data: undefined }
						: { error: undefined, data: undefined };
				},
			},
		];
		const restore: ServiceFn<[], undefined> = (context) =>
			executeHooks(
				context,
				{ service: "media", event: "afterRestore", config: context.config },
				{ meta: {}, data: { ids: [1] } },
			);
		const result = await serviceWrapper(restore, { transaction: true })(
			context,
		);

		expect(Boolean(result.error)).toBe(rollback);
		expect(jobId).toBeDefined();
		expect(publish).toHaveBeenCalledTimes(rollback ? 0 : 1);
		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
			.select("job_id")
			.where("job_id", "=", jobId ?? "")
			.executeTakeFirst();
		expect(stored?.job_id).toBe(rollback ? undefined : jobId);
	});

	test("keeps jobs pending when transport delivery fails", async () => {
		const job = defineJob({
			name: "test:outbox",
			version: 1,
			input: z.object({ value: z.number() }),
			handler: async () => ({ error: undefined, data: undefined }),
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(async () => ({
				error: { message: copy.literal("Transport unavailable") },
				data: undefined,
			})),
		});

		const enqueued = await enqueueJob(context, {
			job,
			payload: { value: 1 },
		});
		expect(enqueued.error).toBeUndefined();
		if (enqueued.error) return;
		const stored = await context.db.kysely
			.selectFrom("lucid_jobs")
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
