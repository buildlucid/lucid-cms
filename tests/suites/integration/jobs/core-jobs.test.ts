import {
	ADMIN,
	advanceClock,
	describe,
	expect,
	requires,
	test,
} from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/collections/reviewed-story";
import { PROBE_JOBS } from "#shared/fragments/jobs";
import {
	enqueueProbe,
	resetScheduler,
	tick,
	uniqueTag,
	waitForJob,
} from "#shared/jobs";

describe("requests scheduled to complete later", () => {
	requires("plugin:harness-jobs");
	requires(`collection:${REVIEWED_STORY_KEY}`);
	//* an inline queue can't hold the request's job until its time
	requires("queue.delayedDelivery");

	//* schedules are kept to the minute, so this waits for the next one
	test(
		"completes an approved request at its scheduled time, rounded up to the minute",
		{
			timeout: 100_000,
		},
		async ({ lucid }) => {
			const admin = await lucid.admin();
			const title = uniqueTag("Scheduled story");
			const requested = await admin.request<{
				data: { id: number; requestId: number };
			}>({
				method: "POST",
				path: `/api/v1/documents/${REVIEWED_STORY_KEY}/request`,
				body: {
					title: `Create ${title}`,
					fields: [{ key: "title", type: "text", value: title }],
				},
			});
			expect(requested.status).toBe(201);
			const { requestId } = requested.body.data;

			const scheduledAt = new Date(Date.now() + 5_000);
			const scheduled = await admin.request({
				method: "PATCH",
				path: `/api/v1/requests/${requestId}`,
				body: { scheduledAt: scheduledAt.toISOString() },
			});
			expect(scheduled.status, JSON.stringify(scheduled.body)).toBe(204);

			const request = await admin.request<{ data: { reviewToken: string } }>({
				path: `/api/v1/requests/${requestId}`,
			});
			const approved = await admin.request({
				method: "POST",
				path: `/api/v1/requests/${requestId}/approve`,
				body: { ifUnchanged: request.body.data.reviewToken },
			});
			expect(approved.status, JSON.stringify(approved.body)).toBe(204);

			type Execution = { jobId: string; status: string; runAt: string | null };
			const execution = await admin.request<{ data: Execution | null }>({
				path: `/api/v1/requests/${requestId}/execution`,
			});
			const runAt = Date.parse(execution.body.data?.runAt ?? "");
			expect(runAt).toBe(Math.ceil(scheduledAt.getTime() / 60_000) * 60_000);

			const job = await waitForJob(
				lucid,
				execution.body.data?.jobId ?? "",
				"completed",
				{ timeout: 80_000 },
			);
			expect(Date.parse(job.startedAt ?? "")).toBeGreaterThanOrEqual(runAt);
		},
	);
});

describe("notification emails", () => {
	requires("plugin:harness-jobs");
	//* it moves the CMS's clock forward
	requires("mode:host");

	test.afterEach(async ({ lucid }) => {
		await resetScheduler(lucid);
	});

	test("emails a job failure notice to job readers who haven't read it within ten minutes", async ({
		lucid,
	}) => {
		const match = { to: ADMIN.email, template: "notification" };
		const before = (await lucid.emails(match)).length;
		const jobId = await enqueueProbe(lucid, {
			tag: uniqueTag("emailed"),
			steps: ["fail"],
		});
		await waitForJob(lucid, jobId, "failed");

		await tick(lucid);
		expect(await lucid.emails(match)).toHaveLength(before);

		advanceClock(11 * 60 * 1000);
		await tick(lucid);
		const email = await lucid.email({ ...match, after: before });
		expect(email.subject).toContain(PROBE_JOBS.probe);
	});
});
