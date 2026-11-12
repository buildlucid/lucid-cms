import { expect, requires, test } from "#harness/playwright";
import { PROBE_JOBS, PROBE_RETRY } from "#shared/fragments/jobs";
import { enqueueProbe, uniqueTag, waitForJob } from "#shared/jobs";

test.describe("jobs in the admin", () => {
	requires("plugin:harness-jobs");

	test("shows why a job failed for good, with the stack of its last error", async ({
		page,
		lucid,
	}) => {
		const tag = uniqueTag("admin-failed");
		const jobId = await enqueueProbe(lucid, { tag, steps: ["throw"] });
		await waitForJob(lucid, jobId, "failed");

		//* the address the job's failure notice links to
		await page.goto(
			`/admin/system/jobs?${new URLSearchParams({ "filter[jobId]": jobId })}`,
		);
		const row = page.getByRole("row").filter({ hasText: PROBE_JOBS.probe });
		await expect(row).toHaveCount(1);
		await expect(row.getByRole("cell").first()).toHaveText("failed");
		await row.click();

		const drawer = page.getByRole("dialog", {
			name: `${PROBE_JOBS.probe} Failed`,
		});
		await expect(drawer).toContainText(jobId);
		const message = `Probe ${tag} threw on attempt ${PROBE_RETRY.maxAttempts}.`;
		await expect(drawer.getByText(message, { exact: true })).toBeVisible();
		await expect(drawer).toContainText(
			`Attempts${PROBE_RETRY.maxAttempts}/${PROBE_RETRY.maxAttempts}`,
		);

		await drawer.getByRole("button", { name: "Stack Trace" }).click();
		await expect(drawer.getByText(`Error: ${message}`)).toBeVisible();
	});

	test("lists jobs by status, so finished ones can be told from failed ones", async ({
		page,
		lucid,
	}) => {
		const completed = await enqueueProbe(lucid, {
			tag: uniqueTag("admin-completed"),
			steps: ["succeed"],
		});
		await waitForJob(lucid, completed, "completed");

		await page.goto(
			`/admin/system/jobs?${new URLSearchParams({ "filter[jobId]": completed, "filter[status]": "failed" })}`,
		);
		await expect(
			page.getByRole("row").filter({ hasText: PROBE_JOBS.probe }),
		).toHaveCount(0);

		await page.goto(
			`/admin/system/jobs?${new URLSearchParams({ "filter[jobId]": completed, "filter[status]": "completed" })}`,
		);
		await expect(
			page.getByRole("row").filter({ hasText: PROBE_JOBS.probe }),
		).toHaveCount(1);
	});
});
