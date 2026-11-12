import { randomUUID } from "node:crypto";
import {
	describe,
	expect,
	notApplicable,
	requires,
	test,
} from "#harness/vitest";
import {
	cancelJob,
	deliverJob,
	enqueueProbe,
	executions,
	readJob,
	tick,
	uniqueTag,
	waitForExecution,
	waitForJob,
} from "#shared/helpers/jobs";

/** A running job learns it was cancelled when it next renews its lease, every 20 seconds. */
const HEARTBEAT_MS = 20_000;

describe("cancelling jobs", () => {
	requires("plugin:harness-jobs");

	test("reports a job that has already finished, and leaves it as it was", async ({
		lucid,
	}) => {
		const jobId = await enqueueProbe(lucid, {
			tag: uniqueTag("finished"),
			steps: ["succeed"],
		});
		await waitForJob(lucid, jobId, "completed");

		expect(await cancelJob(lucid, jobId)).toEqual({
			type: "already-finished",
			status: "completed",
		});
		expect((await readJob(lucid, jobId)).status).toBe("completed");
	});

	test("reports a job that doesn't exist", async ({ lucid }) => {
		expect(await cancelJob(lucid, randomUUID())).toEqual({ type: "not-found" });
	});

	test(
		"asks a running job to stop, which aborts its handler at its next heartbeat",
		{ timeout: HEARTBEAT_MS + 20_000 },
		async ({ lucid, skip }) => {
			skip(
				lucid.mode === "served" &&
					lucid.capabilities.includes("queue:cloudflare-queues"),
				notApplicable(
					"workerd's local queue sends one batch at a time, so a job held for 20 seconds holds up every other test's jobs. Deployed queues run batches side by side.",
				),
			);
			const tag = uniqueTag("running");
			//* an inline queue runs the job inside this request, so it ends when the job does
			const enqueued = enqueueProbe(lucid, { tag, steps: ["hang"] });
			enqueued.catch(() => undefined);
			const { jobId } = await waitForExecution(lucid, {
				tag,
				event: "started",
			});

			expect(await cancelJob(lucid, jobId)).toEqual({
				type: "cancellation-requested",
			});
			await waitForExecution(
				lucid,
				{ tag, event: "aborted" },
				{ timeout: HEARTBEAT_MS + 5_000 },
			);
			const job = await waitForJob(lucid, jobId, "cancelled");
			expect(job.cancelledAt).not.toBeNull();
			await enqueued;
		},
	);

	describe("on a queue that can hold jobs until later", () => {
		requires("queue.delayedDelivery");

		test("cancels a queued job, which then never runs", async ({ lucid }) => {
			const tag = uniqueTag("queued");
			const jobId = await enqueueProbe(lucid, {
				tag,
				steps: ["succeed"],
				runAt: new Date(Date.now() + 60_000),
			});

			expect(await cancelJob(lucid, jobId)).toEqual({ type: "cancelled" });
			//* a queue may still deliver its message, which the job ignores
			expect(await deliverJob(lucid, jobId)).toEqual([{ type: "ignored" }]);
			expect((await readJob(lucid, jobId)).status).toBe("cancelled");
			expect(await executions(lucid, { tag })).toEqual([]);
		});
	});

	describe("on an inline queue", () => {
		requires("queue:inline");

		test("cancels a job waiting to retry, which then never runs again", async ({
			lucid,
		}) => {
			const tag = uniqueTag("retrying");
			//* the first attempt runs inside this request, and its retry waits for a tick
			const jobId = await enqueueProbe(lucid, {
				tag,
				steps: ["fail", "succeed"],
			});

			expect(await cancelJob(lucid, jobId)).toEqual({ type: "cancelled" });
			await new Promise((resolve) => setTimeout(resolve, 500));
			await tick(lucid);
			expect((await readJob(lucid, jobId)).status).toBe("cancelled");
			expect(await executions(lucid, { tag, event: "started" })).toHaveLength(
				1,
			);
		});
	});
});
