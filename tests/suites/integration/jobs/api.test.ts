import { randomUUID } from "node:crypto";
import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import {
	PROBE_CRON,
	PROBE_JOBS,
	PROBE_SCHEDULES,
} from "#shared/fragments/jobs";
import {
	cancelJob,
	enqueueProbe,
	type Job,
	readJob,
	uniqueTag,
	waitForJob,
} from "#shared/jobs";

type Schedule = {
	key: string;
	jobKey: string;
	cron: string;
	timezone: string;
	overlap: "skip" | "allow";
	missed: "skip" | "run-once";
	state: "active" | "paused";
	nextRunAt: string;
	lastRun: { jobId: string; status: string } | null;
};

const listJobs = async (
	lucid: Lucid,
	query: Record<string, string | number>,
) => {
	const admin = await lucid.admin();
	const response = await admin.request<{ data: Job[] }>({
		path: "/api/v1/jobs",
		query,
	});
	expect(response.status).toBe(200);
	return response.body.data;
};

const runSchedule = async (lucid: Lucid, scheduleKey: string) => {
	const admin = await lucid.admin();
	return admin.request<{ data: { jobId: string } }>({
		method: "POST",
		path: "/api/v1/jobs/schedules/trigger",
		body: { scheduleKey },
	});
};

describe("the jobs API", () => {
	requires("plugin:harness-jobs");

	test("finds jobs by status and name, newest first", async ({ lucid }) => {
		const failed = await enqueueProbe(lucid, {
			tag: uniqueTag("listed-failed"),
			steps: ["fail"],
		});
		await waitForJob(lucid, failed, "failed");
		const completed = await enqueueProbe(lucid, {
			tag: uniqueTag("listed-completed"),
			steps: ["succeed"],
		});
		await waitForJob(lucid, completed, "completed");

		const failures = await listJobs(lucid, {
			"filter[status]": "failed",
			"filter[jobKey]": PROBE_JOBS.probe,
			perPage: 100,
		});
		const ids = failures.map((job) => job.jobId);
		expect(ids).toContain(failed);
		expect(ids).not.toContain(completed);

		const newest = await listJobs(lucid, {
			"filter[jobKey]": PROBE_JOBS.probe,
			sort: "-createdAt",
			perPage: 100,
		});
		const order = newest.map((job) => job.jobId);
		expect(order.indexOf(completed)).toBeLessThan(order.indexOf(failed));
	});

	test("reads a job by the ID its receipt gave, or by its row ID", async ({
		lucid,
	}) => {
		const jobId = await enqueueProbe(lucid, {
			tag: uniqueTag("read"),
			steps: ["succeed"],
		});
		const byJobId = await readJob(lucid, jobId);
		const [listed] = await listJobs(lucid, { "filter[jobId]": jobId });
		expect(listed?.jobId).toBe(jobId);

		const admin = await lucid.admin();
		const byRowId = await admin.request<{ data: Job }>({
			path: `/api/v1/jobs/${listed?.id}`,
		});
		expect(byRowId.status).toBe(200);
		expect(byRowId.body.data.jobId).toBe(byJobId.jobId);
	});

	test("answers not found for a job that doesn't exist", async ({ lucid }) => {
		const admin = await lucid.admin();
		for (const id of [randomUUID(), "999999999"]) {
			const response = await admin.request({ path: `/api/v1/jobs/${id}` });
			expect(response.status, id).toBe(404);
		}
	});
});

describe("the job schedules API", () => {
	requires("plugin:harness-jobs");

	test("lists each schedule with its timing, rules and next run", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const response = await admin.request<{ data: Schedule[] }>({
			path: "/api/v1/jobs/schedules",
			query: { "filter[jobKey]": PROBE_JOBS.scheduled, perPage: 50 },
		});
		expect(response.status).toBe(200);
		const schedules = new Map(
			response.body.data.map((schedule) => [schedule.key, schedule]),
		);

		expect(schedules.get(PROBE_SCHEDULES.allow)).toMatchObject({
			jobKey: PROBE_JOBS.scheduled,
			cron: PROBE_CRON,
			timezone: "UTC",
			overlap: "allow",
			missed: "run-once",
		});
		expect(schedules.get(PROBE_SCHEDULES.missedSkip)).toMatchObject({
			overlap: "skip",
			missed: "skip",
		});
		const next = new Date(
			schedules.get(PROBE_SCHEDULES.allow)?.nextRunAt ?? "",
		);
		expect(next.getTime()).toBeGreaterThan(Date.now());
		expect([
			next.getUTCDate(),
			next.getUTCHours(),
			next.getUTCMinutes(),
		]).toEqual([1, 12, 30]);
	});

	test("runs a schedule early, and refuses again while that run is still active", async ({
		lucid,
	}) => {
		const first = await runSchedule(lucid, PROBE_SCHEDULES.runNow);
		expect(first.status).toBe(200);
		const { jobId } = first.body.data;

		//* its first attempt fails and waits an hour to retry, so it stays active
		const job = await waitForJob(lucid, jobId, "queued", { tick: false });
		expect(job).toMatchObject({
			triggerType: "schedule",
			scheduleKey: PROBE_SCHEDULES.runNow,
		});
		await expect
			.poll(async () => (await readJob(lucid, jobId)).attempts)
			.toBe(1);
		expect((await runSchedule(lucid, PROBE_SCHEDULES.runNow)).status).toBe(409);

		const admin = await lucid.admin();
		const listed = await admin.request<{ data: Schedule[] }>({
			path: "/api/v1/jobs/schedules",
			query: { "filter[key]": PROBE_SCHEDULES.runNow },
		});
		expect(
			listed.body.data.find(
				(schedule) => schedule.key === PROBE_SCHEDULES.runNow,
			)?.lastRun,
		).toMatchObject({ jobId, status: "queued" });

		await cancelJob(lucid, jobId);
		expect((await runSchedule(lucid, PROBE_SCHEDULES.runNow)).status).toBe(200);
	});

	test("answers not found for a schedule that doesn't exist", async ({
		lucid,
	}) => {
		expect((await runSchedule(lucid, "harness:missing/schedule")).status).toBe(
			404,
		);
	});
});
