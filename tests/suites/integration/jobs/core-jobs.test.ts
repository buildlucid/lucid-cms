import {
	ADMIN,
	advanceClock,
	describe,
	expect,
	requires,
	test,
} from "#harness/vitest";
import { PROBE_JOBS } from "#shared/fragments/jobs";
import {
	enqueueProbe,
	resetScheduler,
	tick,
	uniqueTag,
	waitForJob,
} from "#shared/jobs";

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
