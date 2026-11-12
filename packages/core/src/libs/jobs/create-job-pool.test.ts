import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import z from "zod";
import {
	createJobsContext,
	createTestQueueAdapter,
} from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { createJobPool } from "./create-job-pool.js";
import defineJob from "./define-job.js";
import { enqueueJob, enqueueJobs } from "./enqueue.js";

const testConfig = getTestConfig();

beforeAll(() => testConfig.migrate());

afterEach(async () => {
	const database = await testConfig.getDatabase();
	await database.client.deleteFrom("lucid_jobs").execute();
});

afterAll(() => testConfig.destroy());

describe("job pools", () => {
	test("keeps no more jobs running than its limit, filling slots as jobs end", async () => {
		let active = 0;
		let maximumActive = 0;
		const job = defineJob({
			key: "test:pool-limit",
			version: 1,
			input: z.object({}),
			handler: async () => {
				active += 1;
				maximumActive = Math.max(maximumActive, active);
				await new Promise((resolve) => setTimeout(resolve, 10));
				active -= 1;
			},
		});
		const context = await createJobsContext(testConfig, {
			jobs: [job],
			adapter: createTestQueueAdapter(),
		});
		await enqueueJobs(context, { job, payload: [{}, {}, {}, {}, {}, {}] });

		const finished = Promise.withResolvers<void>();
		let settled = 0;
		const pool = createJobPool({
			maxConcurrentJobs: 2,
			batchSize: 10,
			onSettled: () => {
				settled += 1;
				if (settled === 6) finished.resolve();
				else void pool.fill(context);
			},
		});

		expect(await pool.fill(context)).toEqual({
			error: undefined,
			data: { started: 2 },
		});
		await finished.promise;
		expect(maximumActive).toBe(2);
	});

	test("starts ready jobs while a slow one is still running", async () => {
		const release = Promise.withResolvers<void>();
		const quickDone = Promise.withResolvers<void>();
		const slow = defineJob({
			key: "test:pool-slow",
			version: 1,
			input: z.object({}),
			handler: () => release.promise,
		});
		const quick = defineJob({
			key: "test:pool-quick",
			version: 1,
			input: z.object({}),
			handler: () => quickDone.resolve(),
		});
		const context = await createJobsContext(testConfig, {
			jobs: [slow, quick],
			adapter: createTestQueueAdapter(),
		});
		const pool = createJobPool({ maxConcurrentJobs: 2, batchSize: 10 });

		await enqueueJob(context, { job: slow, payload: {} });
		expect((await pool.fill(context)).data).toEqual({ started: 1 });

		await enqueueJob(context, { job: quick, payload: {} });
		expect((await pool.fill(context)).data).toEqual({ started: 1 });
		await quickDone.promise;
		expect(pool.active).toBeGreaterThanOrEqual(1);

		release.resolve();
		await pool.settle();
		expect(pool.active).toBe(0);
	});
});
