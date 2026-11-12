import { describe, expect, requires, test } from "#harness/vitest";
import {
	cancelJob,
	deliverJob,
	enqueueProbe,
	executions,
	readJob,
	uniqueTag,
	waitForJob,
} from "#shared/jobs";

/** How far ahead the job is due, so every delivery can arrive at the moment it becomes ready. */
const DUE_IN_MS = 1_500;

const sleepUntil = (date: Date) =>
	new Promise((resolve) => setTimeout(resolve, date.getTime() - Date.now()));

describe("jobs delivered by queues that race each other", () => {
	requires("plugin:harness-jobs");
	//* separate connections only block and race each other on a real Postgres server
	requires("database.concurrentWrites");
	requires("queue.delayedDelivery");

	test("runs a job once when its message arrives many times at once", async ({
		lucid,
	}) => {
		const tag = uniqueTag("duplicates");
		const runAt = new Date(Date.now() + DUE_IN_MS);
		const jobId = await enqueueProbe(lucid, {
			tag,
			steps: ["hang"],
			hangMs: 300,
			runAt,
		});

		await sleepUntil(runAt);
		//* the queue's own consumer delivers it too, so it races these
		const results = await deliverJob(lucid, jobId, 10);
		await waitForJob(lucid, jobId, "completed");

		expect(
			results.filter((result) => result.type === "completed").length,
		).toBeLessThanOrEqual(1);
		expect(await executions(lucid, { tag, event: "started" })).toHaveLength(1);
	});

	test("never runs a job its cancellation reached first, and ends cancelled otherwise", async ({
		lucid,
	}) => {
		const tag = uniqueTag("cancel-race");
		const runAt = new Date(Date.now() + DUE_IN_MS);
		const jobId = await enqueueProbe(lucid, { tag, steps: ["succeed"], runAt });

		await sleepUntil(runAt);
		const [cancelled] = await Promise.all([
			cancelJob(lucid, jobId),
			deliverJob(lucid, jobId, 5),
		]);
		const job = await waitForJob(lucid, jobId, ["completed", "cancelled"]);
		const started = await executions(lucid, { tag, event: "started" });

		switch (cancelled.type) {
			case "cancelled":
				expect(started).toEqual([]);
				expect(job.status).toBe("cancelled");
				break;
			case "cancellation-requested":
				//* the handler finished first, and its completion saw the request
				expect(job.status).toBe("cancelled");
				break;
			case "already-finished":
				expect(job.status).toBe("completed");
				break;
			default:
				throw new Error(`Unexpected cancellation result ${cancelled.type}.`);
		}
		expect(started.length).toBeLessThanOrEqual(1);
		expect((await readJob(lucid, jobId)).status).toBe(job.status);
	});
});
