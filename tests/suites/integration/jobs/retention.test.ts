import type { Job } from "@lucidcms/core/types";
import {
	ADMIN,
	advanceClock,
	describe,
	expect,
	login,
	requires,
	test,
} from "#harness/vitest";
import {
	enqueueProbe,
	resetScheduler,
	uniqueTag,
	waitForJob,
} from "#shared/helpers/jobs";

const DAY_MS = 24 * 60 * 60 * 1000;

//* its own file, as maintenance a week ahead also clears the shared admin's sessions
describe("job retention", () => {
	requires("plugin:harness-jobs");
	//* it moves the CMS's clock forward
	requires("mode:host");

	test.afterEach(async ({ lucid }) => {
		await resetScheduler(lucid);
	});

	test("deletes completed jobs once they are older than a week, and keeps failed ones for a month", async ({
		lucid,
	}) => {
		const completed = await enqueueProbe(lucid, {
			tag: uniqueTag("retained"),
			steps: ["succeed"],
		});
		const failed = await enqueueProbe(lucid, {
			tag: uniqueTag("retained"),
			steps: ["fail"],
		});
		await waitForJob(lucid, completed, "completed");
		await waitForJob(lucid, failed, "failed");

		advanceClock(8 * DAY_MS);
		//* the admin's refresh token lasts a week, so sign in again past it
		const admin = lucid.session();
		await login(admin, ADMIN);
		const run = await admin.request<{ data: { jobId: string } }>({
			method: "POST",
			path: "/api/v1/jobs/schedules/trigger",
			body: { scheduleKey: "core:delete-expired-data/automatic" },
		});
		expect(run.status).toBe(200);
		await expect
			.poll(
				async () => {
					const response = await admin.request<{ data: Job }>({
						path: `/api/v1/jobs/${run.body.data.jobId}`,
					});
					return response.body.data.status;
				},
				{ timeout: 20_000 },
			)
			.toBe("completed");

		const status = async (jobId: string) =>
			(await admin.request({ path: `/api/v1/jobs/${jobId}` })).status;
		expect(await status(completed)).toBe(404);
		expect(await status(failed)).toBe(200);
	});
});
