import {
	advanceClock,
	describe,
	expect,
	requires,
	test,
} from "#harness/vitest";
import { PROBE_RETRY } from "#shared/config/fragments/jobs";
import {
	cancelJob,
	enqueueProbe,
	executions,
	readJob,
	resetScheduler,
	tick,
	uniqueTag,
	waitForExecution,
	waitForJob,
} from "#shared/helpers/jobs";

/** Past the minute a lease lasts without being renewed. */
const LEASE_EXPIRED_MS = 61_000;

/**
 * Long enough to move the clock and tick while the job still runs. The clock only moves `Date`,
 * so the lease expires without anyone waiting, and the hang ends soon after.
 */
const HANG_MS = 5_000;

/** Starts a hanging attempt without waiting for it, as an inline queue holds the request until it ends. */
const startHanging = (
	lucid: Parameters<typeof tick>[0],
	request: Parameters<typeof enqueueProbe>[1],
) => {
	const enqueued = enqueueProbe(lucid, request);
	enqueued.catch(() => undefined);
	return enqueued;
};

describe("recovering jobs whose lease expired", () => {
	requires("plugin:harness-jobs");
	//* it moves the CMS's clock past the lease
	requires("mode:host");

	//* a tick after the clock moved leaves the scheduler's cursor ahead of the real clock
	test.afterEach(async ({ lucid }) => {
		await resetScheduler(lucid);
	});

	test("runs a job again when the worker running it stopped renewing its lease", async ({
		lucid,
	}) => {
		const tag = uniqueTag("lost-lease");
		const enqueued = startHanging(lucid, {
			tag,
			steps: ["hang", "succeed"],
			hangMs: HANG_MS,
		});
		const { jobId } = await waitForExecution(lucid, { tag, event: "started" });

		advanceClock(LEASE_EXPIRED_MS);
		await tick(lucid);
		const job = await waitForJob(lucid, jobId, "completed");
		expect(job.attempts).toBe(2);

		//* the first attempt finishing late leaves the job as the second left it
		await waitForExecution(
			lucid,
			{ tag, event: "finished-hanging" },
			{ timeout: HANG_MS * 2 },
		);
		await enqueued;
		expect(await readJob(lucid, jobId)).toMatchObject({
			status: "completed",
			attempts: 2,
		});
	});

	test("fails a job for good when its last attempt's lease expires", async ({
		lucid,
	}) => {
		const tag = uniqueTag("last-lease");
		const steps = [
			...Array.from(
				{ length: PROBE_RETRY.maxAttempts - 1 },
				() => "fail" as const,
			),
			"hang" as const,
		];
		const enqueued = startHanging(lucid, { tag, steps, hangMs: HANG_MS });
		//* retries on an inline queue wait for a tick, which runs the hanging attempt and waits for it
		const ticking = setInterval(() => {
			tick(lucid).catch(() => undefined);
		}, 300);
		const { jobId } = await waitForExecution(lucid, {
			tag,
			event: "started",
			attempt: PROBE_RETRY.maxAttempts,
		}).finally(() => clearInterval(ticking));

		advanceClock(LEASE_EXPIRED_MS);
		await tick(lucid);
		const job = await waitForJob(lucid, jobId, "failed", { tick: false });
		expect(job.errorMessage).toEqual(expect.any(String));
		expect(
			await executions(lucid, { tag, event: "permanently-failed" }),
		).toHaveLength(1);

		await waitForExecution(
			lucid,
			{ tag, event: "finished-hanging" },
			{ timeout: HANG_MS * 2 },
		);
		await enqueued;
		expect((await readJob(lucid, jobId)).status).toBe("failed");
	});

	test("cancels a running job asked to stop once its lease expires, without waiting for it", async ({
		lucid,
	}) => {
		const tag = uniqueTag("cancel-lease");
		const enqueued = startHanging(lucid, {
			tag,
			steps: ["hang"],
			hangMs: HANG_MS,
		});
		const { jobId } = await waitForExecution(lucid, { tag, event: "started" });
		expect(await cancelJob(lucid, jobId)).toEqual({
			type: "cancellation-requested",
		});

		advanceClock(LEASE_EXPIRED_MS);
		await tick(lucid);
		expect((await readJob(lucid, jobId)).status).toBe("cancelled");

		await waitForExecution(
			lucid,
			{ tag, event: "finished-hanging" },
			{ timeout: HANG_MS * 2 },
		);
		await enqueued;
		expect((await readJob(lucid, jobId)).status).toBe("cancelled");
		expect(await executions(lucid, { tag, event: "started" })).toHaveLength(1);
	});
});
