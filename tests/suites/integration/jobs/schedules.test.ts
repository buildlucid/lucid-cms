import type { Job } from "@lucidcms/core/types";
import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { PROBE_SCHEDULES } from "#shared/config/fragments/jobs";
import { executions, resetScheduler, tick } from "#shared/helpers/jobs";

/** When the probe schedules run in a month: half past twelve on the first, in UTC. */
const occurrence = (month: number) =>
	new Date(Date.UTC(2031, month - 1, 1, 12, 30));

/** The jobs a schedule has enqueued, oldest first. */
const scheduledJobs = async (lucid: Lucid, scheduleKey: string) => {
	const admin = await lucid.admin();
	const response = await admin.request<{ data: Job[] }>({
		path: "/api/v1/jobs",
		query: {
			"filter[scheduleKey]": scheduleKey,
			sort: "createdAt",
			perPage: 50,
		},
	});
	expect(response.status).toBe(200);
	return response.body.data;
};

const setState = async (
	lucid: Lucid,
	scheduleKey: string,
	state: "active" | "paused",
) => {
	const admin = await lucid.admin();
	const response = await admin.request({
		method: "PATCH",
		path: "/api/v1/jobs/schedules/state",
		body: { scheduleKey, state },
	});
	expect(response.status).toBe(200);
};

describe("job schedules", () => {
	requires("plugin:harness-jobs");
	//* each tick picks its own time, which moves the scheduler's cursor for everyone on the CMS
	requires("mode:host");

	test.beforeEach(async ({ lucid }) => {
		await resetScheduler(lucid);
	});
	test.afterEach(async ({ lucid }) => {
		await resetScheduler(lucid);
	});

	test("enqueues one job per occurrence, however often and however many ticks run in its minute", async ({
		lucid,
	}) => {
		const at = occurrence(1);
		await tick(lucid, at);
		await Promise.all(
			[0, 10_000, 30_000, 59_000].map((offset) =>
				tick(lucid, new Date(at.getTime() + offset)),
			),
		);

		for (const key of [PROBE_SCHEDULES.runOnce, PROBE_SCHEDULES.missedSkip]) {
			const jobs = await scheduledJobs(lucid, key);
			expect(jobs, key).toHaveLength(1);
			expect(jobs[0]).toMatchObject({
				triggerType: "schedule",
				scheduledFor: at.toISOString(),
				status: "completed",
			});
		}
		const runs = await executions(lucid, { tag: "run-once", event: "started" });
		expect(runs).toEqual([expect.objectContaining({ trigger: "schedule" })]);
	});

	test("starts from its first tick, then runs a missed occurrence once unless the schedule skips missed ones", async ({
		lucid,
	}) => {
		//* a scheduler that has never ticked doesn't catch up on what came before
		await tick(lucid, new Date(Date.UTC(2031, 0, 15, 9)));
		expect(await scheduledJobs(lucid, PROBE_SCHEDULES.runOnce)).toEqual([]);

		//* February's and March's occurrences pass without a tick
		await tick(lucid, new Date(Date.UTC(2031, 2, 15, 9)));

		const caughtUp = await scheduledJobs(lucid, PROBE_SCHEDULES.runOnce);
		expect(caughtUp.map((job) => job.scheduledFor)).toEqual([
			occurrence(3).toISOString(),
		]);
		expect(await scheduledJobs(lucid, PROBE_SCHEDULES.missedSkip)).toEqual([]);
	});

	test("skips an occurrence while the last one is still active, unless overlap is allowed", async ({
		lucid,
	}) => {
		//* each first attempt fails and waits an hour to retry, so the job stays queued
		await tick(lucid, occurrence(1));
		await tick(lucid, occurrence(2));

		const skipped = await scheduledJobs(lucid, PROBE_SCHEDULES.skip);
		expect(skipped.map((job) => [job.scheduledFor, job.status])).toEqual([
			[occurrence(1).toISOString(), "queued"],
		]);
		const allowed = await scheduledJobs(lucid, PROBE_SCHEDULES.allow);
		expect(allowed.map((job) => job.scheduledFor)).toEqual([
			occurrence(1).toISOString(),
			occurrence(2).toISOString(),
		]);
	});

	test("runs nothing while paused, and doesn't replay what it missed once resumed", async ({
		lucid,
	}) => {
		await setState(lucid, PROBE_SCHEDULES.runOnce, "paused");
		await tick(lucid, occurrence(1));
		await tick(lucid, occurrence(2));
		expect(await scheduledJobs(lucid, PROBE_SCHEDULES.runOnce)).toEqual([]);

		await setState(lucid, PROBE_SCHEDULES.runOnce, "active");
		await tick(lucid, new Date(occurrence(2).getTime() + 60_000));
		expect(await scheduledJobs(lucid, PROBE_SCHEDULES.runOnce)).toEqual([]);

		await tick(lucid, occurrence(3));
		const jobs = await scheduledJobs(lucid, PROBE_SCHEDULES.runOnce);
		expect(jobs.map((job) => job.scheduledFor)).toEqual([
			occurrence(3).toISOString(),
		]);
	});
});
