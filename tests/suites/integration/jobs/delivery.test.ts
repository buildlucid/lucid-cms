import { describe, expect, requires, test } from "#harness/vitest";
import {
	enqueueProbe,
	executions,
	requestProbe,
	uniqueTag,
	waitForJob,
} from "#shared/jobs";

/** How far ahead delayed jobs are asked for, long enough to see them wait. */
const DELAY_MS = 2_000;

describe("delivering jobs", () => {
	requires("plugin:harness-jobs");

	test("runs a job that is due now without waiting for the scheduler", async ({
		lucid,
	}) => {
		const tag = uniqueTag("now");
		const jobId = await enqueueProbe(lucid, { tag, steps: ["succeed"] });

		await waitForJob(lucid, jobId, "completed", {
			timeout: 5_000,
			tick: false,
		});
	});

	describe("on a queue that can hold jobs until later", () => {
		requires("queue.delayedDelivery");

		test("holds each delayed job until its own time, then runs it", async ({
			lucid,
		}) => {
			const delays = [DELAY_MS, DELAY_MS * 2];
			const jobs = await Promise.all(
				delays.map(async (delay) => {
					const tag = uniqueTag("delayed");
					const runAt = new Date(Date.now() + delay);
					const jobId = await enqueueProbe(lucid, {
						tag,
						steps: ["succeed"],
						runAt,
					});
					return { tag, runAt, jobId };
				}),
			);

			for (const { tag, runAt, jobId } of jobs) {
				const job = await waitForJob(lucid, jobId, "completed");
				expect(Date.parse(job.availableAt)).toBe(runAt.getTime());
				const started = await executions(lucid, { tag, event: "started" });
				expect(started).toHaveLength(1);
				const startedAt = Date.parse(started[0]?.at ?? "");
				expect(startedAt).toBeGreaterThanOrEqual(runAt.getTime());
				//* a delayed job is owed to the queue's timing, not its next idle poll
				expect(startedAt - runAt.getTime()).toBeLessThan(5_000);
			}
		});
	});

	describe("on an inline queue", () => {
		requires("queue:inline");

		test("refuses a delayed job, as it can only run jobs straight away", async ({
			lucid,
		}) => {
			const tag = uniqueTag("refused");
			const response = await requestProbe(lucid, {
				tag,
				steps: ["succeed"],
				runAt: new Date(Date.now() + DELAY_MS),
			});

			expect(response.status).toBe(400);
			expect(JSON.stringify(response.body)).toContain("inline");
			expect(await executions(lucid, { tag })).toEqual([]);
		});
	});

	describe("on Cloudflare Queues", () => {
		requires("queue:cloudflare-queues");

		test("refuses a job delayed past the twelve hours a queue can hold it", async ({
			lucid,
		}) => {
			const response = await requestProbe(lucid, {
				tag: uniqueTag("too-late"),
				steps: ["succeed"],
				runAt: new Date(Date.now() + 13 * 60 * 60 * 1000),
			});

			expect(response.status).toBe(400);
		});
	});
});
