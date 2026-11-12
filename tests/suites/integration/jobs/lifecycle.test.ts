import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { PROBE_JOBS, PROBE_RETRY } from "#shared/config/fragments/jobs";
import {
	enqueueProbe,
	executions,
	type ProbeRequest,
	requestProbe,
	uniqueTag,
	waitForExecution,
	waitForJob,
} from "#shared/helpers/jobs";

describe("running jobs", () => {
	requires("plugin:harness-jobs");

	test("runs a job once and completes it", async ({ lucid }) => {
		const tag = uniqueTag("once");
		const jobId = await enqueueProbe(lucid, { tag, steps: ["succeed"] });

		const job = await waitForJob(lucid, jobId, "completed");
		expect(job).toMatchObject({
			jobKey: PROBE_JOBS.probe,
			triggerType: "enqueue",
			attempts: 1,
			errorMessage: null,
		});
		expect(lucid.capabilities).toContain(`queue:${job.queueAdapterKey}`);
		expect(
			(await executions(lucid, { tag })).map((entry) => entry.event),
		).toEqual(["started", "succeeded"]);
	});

	test("retries a failed attempt once its backoff has passed, then completes", async ({
		lucid,
	}) => {
		const tag = uniqueTag("retry");
		const jobId = await enqueueProbe(lucid, {
			tag,
			steps: ["fail", "succeed"],
		});

		const job = await waitForJob(lucid, jobId, "completed");
		expect(job).toMatchObject({ attempts: 2, errorMessage: null });

		const failed = await executions(lucid, { tag, event: "failed" });
		const retried = await executions(lucid, {
			tag,
			event: "started",
			attempt: 2,
		});
		expect(failed).toHaveLength(1);
		expect(retried).toHaveLength(1);
		const waited =
			Date.parse(retried[0]?.at ?? "") - Date.parse(failed[0]?.at ?? "");
		expect(waited).toBeGreaterThanOrEqual(PROBE_RETRY.baseDelayMs);
	});

	test("fails for good after its last attempt and runs its failure hook", async ({
		lucid,
	}) => {
		const tag = uniqueTag("fails");
		const jobId = await enqueueProbe(lucid, { tag, steps: ["fail"] });

		const job = await waitForJob(lucid, jobId, "failed");
		expect(job).toMatchObject({
			attempts: PROBE_RETRY.maxAttempts,
			errorMessage: `Probe ${tag} failed on attempt ${PROBE_RETRY.maxAttempts}.`,
		});
		expect(job.failedAt).not.toBeNull();

		//* the hook runs once the failure is saved, which a queue's own consumer may not have reached yet
		await waitForExecution(lucid, { tag, event: "permanently-failed" });
		const hooks = await executions(lucid, { tag, event: "permanently-failed" });
		expect(hooks).toEqual([
			expect.objectContaining({ jobId, attempt: PROBE_RETRY.maxAttempts }),
		]);
		expect(await executions(lucid, { tag, event: "started" })).toHaveLength(
			PROBE_RETRY.maxAttempts,
		);
	});

	test("keeps the stack of an error a job throws", async ({ lucid }) => {
		const tag = uniqueTag("throws");
		const jobId = await enqueueProbe(lucid, { tag, steps: ["throw"] });

		const job = await waitForJob(lucid, jobId, "failed");
		const message = `Probe ${tag} threw on attempt ${PROBE_RETRY.maxAttempts}.`;
		expect(job.errorMessage).toBe(message);
		expect(job.errorStack).toContain(message);
	});

	test("stores one job for an idempotency key, however often it is enqueued", async ({
		lucid,
	}) => {
		const tag = uniqueTag("idempotent");
		const request: ProbeRequest = {
			tag,
			steps: ["succeed"],
			idempotencyKey: tag,
		};

		const first = await enqueueProbe(lucid, request);
		await waitForJob(lucid, first, "completed");
		const second = await enqueueProbe(lucid, request);

		expect(second).toBe(first);
		expect(await executions(lucid, { tag, event: "started" })).toHaveLength(1);
	});

	test("never stores or runs a job enqueued by a transaction that rolls back", async ({
		lucid,
	}) => {
		const tag = uniqueTag("rolled-back");
		const response = await requestProbe(lucid, {
			tag,
			steps: ["succeed"],
			rollback: true,
		});
		expect(response.body.data.rolledBack).toBe(true);
		const jobId = response.body.data.jobId;
		expect(jobId).toEqual(expect.any(String));

		const admin = await lucid.admin();
		const read = await admin.request({ path: `/api/v1/jobs/${jobId}` });
		expect(read.status).toBe(404);
		expect(await executions(lucid, { tag })).toEqual([]);
	});
});

describe("jobs that commit their writes with their completion", () => {
	requires("plugin:harness-jobs");

	//* each attempt adds its number to the job's `effects`, so they show which attempts' writes stayed
	test.for([
		{ transaction: false, effects: [1, 2] },
		{ transaction: true, effects: [2] },
	])(
		"keeps $effects when the first attempt fails (transaction: $transaction)",
		async ({ transaction, effects }, { lucid }) => {
			const tag = uniqueTag("effects");
			const jobId = await enqueueProbe(lucid, {
				tag,
				steps: ["fail", "succeed"],
				transaction,
			});

			const job = await waitForJob(lucid, jobId, "completed");
			expect(job.jobKey).toBe(
				transaction ? PROBE_JOBS.transactional : PROBE_JOBS.probe,
			);
			expect(job.displayData?.effects).toEqual(effects);
		},
	);

	test("keeps none of a transactional job's writes when it fails for good", async ({
		lucid,
	}) => {
		const tag = uniqueTag("effects-failed");
		const jobId = await enqueueProbe(lucid, {
			tag,
			steps: ["fail"],
			transaction: true,
		});

		const job = await waitForJob(lucid, jobId, "failed");
		expect(job.displayData?.effects).toBeUndefined();
		expect(await executions(lucid, { tag, event: "started" })).toHaveLength(
			PROBE_RETRY.maxAttempts,
		);
	});
});

describe("failure notices", () => {
	requires("plugin:harness-jobs");
	//* the notice is one per job name, which other files' probes would change on a shared server
	requires("mode:host");

	type Notice = {
		data: { jobId: string; jobKey: string };
		resolvedAt: string | null;
	};

	const readNotice = async (lucid: Lucid) => {
		const admin = await lucid.admin();
		const response = await admin.request<{ data: Notice[] }>({
			path: "/api/v1/notifications",
			query: { "filter[type]": "system:job-failed" },
		});
		expect(response.status).toBe(200);
		return response.body.data.find(
			(notice) => notice.data.jobKey === PROBE_JOBS.probe,
		);
	};

	test("tells job readers once a job fails for good, until that job next completes", async ({
		lucid,
	}) => {
		const failed = await enqueueProbe(lucid, {
			tag: uniqueTag("notice"),
			steps: ["fail"],
		});
		await waitForJob(lucid, failed, "failed");
		//* the notice follows the failure, which a queue's own consumer may not have sent yet
		await expect
			.poll(() => readNotice(lucid))
			.toMatchObject({ data: { jobId: failed }, resolvedAt: null });

		const completed = await enqueueProbe(lucid, {
			tag: uniqueTag("notice"),
			steps: ["succeed"],
		});
		await waitForJob(lucid, completed, "completed");
		await expect
			.poll(async () => (await readNotice(lucid))?.resolvedAt)
			.toEqual(expect.any(String));
	});
});
