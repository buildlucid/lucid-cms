import { expect, type Page, requires, test } from "#harness/playwright";
import { PROBE_SCHEDULES } from "#shared/fragments/jobs";
import { cancelJob, type Job } from "#shared/jobs";

/** Filters the schedules list, the page's first table, down to one schedule by its own key. */
const showSchedule = async (page: Page, name: string) => {
	await page.goto("/admin/system/jobs");
	await page.getByRole("button", { name: "Filter" }).first().click();
	await page.getByRole("button", { name: "Where" }).click();
	await page.getByRole("menuitem", { name: "Schedule" }).click();
	await page.getByRole("button", { name: "Operator" }).click();
	await page.getByRole("menuitem", { name: "equals" }).click();
	await page.getByRole("textbox", { name: "Value" }).fill(name);

	const rows = page.getByRole("table").first().getByRole("row");
	const row = rows.filter({ hasText: "harness:scheduled-probe" });
	await expect(row).toHaveCount(1);
	await expect(row.getByRole("cell").nth(1)).toContainText(name);
	return row;
};

/** Picks an action from a row's options menu. */
const chooseAction = async (
	page: Page,
	row: ReturnType<Page["getByRole"]>,
	action: string,
) => {
	await row.getByRole("button", { name: "Show Options" }).click();
	await page.getByRole("menuitem", { name: action }).click();
};

test.describe("job schedules in the admin", () => {
	requires("plugin:harness-jobs");

	test("pauses a schedule and resumes it", async ({ page, lucid }) => {
		const row = await showSchedule(page, "run-once");
		await expect(row.getByRole("cell").first()).toHaveText("Active");

		await chooseAction(page, row, "Pause");
		const pause = page.getByRole("alertdialog", { name: "Pause Schedule?" });
		await pause.getByRole("button", { name: "Pause Schedule" }).click();
		await expect(pause).toBeHidden();
		await expect(row.getByRole("cell").first()).toHaveText("Paused");

		const admin = await lucid.admin();
		const paused = await admin.request<{ data: { state: string }[] }>({
			path: "/api/v1/jobs/schedules",
			query: { "filter[key]": PROBE_SCHEDULES.runOnce },
		});
		expect(paused.body.data[0]?.state).toBe("paused");

		await chooseAction(page, row, "Resume");
		const resume = page.getByRole("alertdialog", { name: "Resume Schedule?" });
		await resume.getByRole("button", { name: "Resume Schedule" }).click();
		await expect(resume).toBeHidden();
		await expect(row.getByRole("cell").first()).toHaveText("Active");
	});

	test("runs a schedule early and lists the run", async ({ page, lucid }) => {
		const row = await showSchedule(page, "allow");

		await chooseAction(page, row, "Run Now");
		await expect(
			page.getByText("The scheduled job was queued to run now."),
		).toBeVisible();

		await chooseAction(page, row, "Runs");
		const runs = page.getByRole("dialog");
		await expect(
			runs.getByRole("heading", { name: "Schedule Runs" }),
		).toBeVisible();
		const run = runs
			.getByRole("row")
			.filter({ hasText: "harness:scheduled-probe" });
		await expect(run.first()).toBeVisible();

		//* its first attempt fails and would retry an hour later, so the run is cancelled
		const admin = await lucid.admin();
		const queued = await admin.request<{ data: Job[] }>({
			path: "/api/v1/jobs",
			query: {
				"filter[scheduleKey]": PROBE_SCHEDULES.allow,
				"filter[status]": "queued",
				perPage: 100,
			},
		});
		for (const job of queued.body.data) {
			await cancelJob(lucid, job.jobId);
		}
	});
});
