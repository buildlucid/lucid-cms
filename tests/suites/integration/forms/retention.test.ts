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
import { CONTACT_FORM_KEY } from "#shared/config/fragments/forms";
import { createDocument } from "#shared/helpers/documents";
import {
	contactAnswers,
	FORMS_KEY,
	findSubmission,
	formBuilder,
	SUBMISSIONS_KEY,
	submitForm,
	uniqueFormKey,
} from "#shared/helpers/forms";
import { resetScheduler } from "#shared/helpers/jobs";

const DAY_MS = 24 * 60 * 60 * 1000;

//* its own file, as it moves the CMS's clock forward
describe("submission retention", () => {
	requires("plugin:forms", "plugin:harness-jobs", "mode:host");

	test.afterEach(async ({ lucid }) => {
		await resetScheduler(lucid);
	});

	test("deletes submissions older than their form keeps them, and no others", async ({
		lucid,
	}) => {
		const build = formBuilder(lucid);
		const createForm = async (prefix: string, retentionDays: number) => {
			const key = uniqueFormKey(prefix);
			await createDocument(
				await lucid.admin(),
				FORMS_KEY,
				build.form({
					key,
					bricks: [build.field(0, "email", { name: "email", required: true })],
					fields: [
						{ key: "retentionDays", type: "number", value: retentionDays },
					],
				}),
			);
			await submitForm(lucid, key, { email: `${key}@example.com` });
			return { key, email: `${key}@example.com` };
		};
		const short = await createForm("short-lived", 3);
		const binned = await createForm("binned", 3);
		const long = await createForm("long-lived", 30);
		const unlimited = contactAnswers();
		await submitForm(lucid, CONTACT_FORM_KEY, unlimited);

		//* a binned submission still holds its answers, so it goes when its time is up too
		const inBin = await findSubmission(
			await lucid.admin(),
			binned.email,
			binned.key,
		);
		await (
			await lucid.admin()
		).request({
			method: "DELETE",
			path: `/api/v1/documents/${SUBMISSIONS_KEY}/${inBin?.id}`,
		});

		advanceClock(4 * DAY_MS);
		//* a new session, as the shared admin's tokens would be renewed in the future
		const admin = lucid.session();
		await login(admin, ADMIN);
		const run = await admin.request<{ data: { jobId: string } }>({
			method: "POST",
			path: "/api/v1/jobs/schedules/trigger",
			body: { scheduleKey: "forms:prune-submissions/daily" },
		});
		expect(run.status).toBe(200);
		await expect
			.poll(
				async () =>
					(
						await admin.request<{ data: Job }>({
							path: `/api/v1/jobs/${run.body.data.jobId}`,
						})
					).body.data.status,
				{ timeout: 20_000 },
			)
			.toBe("completed");

		expect(await findSubmission(admin, short.email, short.key)).toBeUndefined();
		const stillBinned = await admin.request<{ data: unknown[] }>({
			path: `/api/v1/documents/${SUBMISSIONS_KEY}/latest`,
			query: { "filter[isDeleted]": 1, "filter[fields.form]": binned.key },
		});
		expect(stillBinned.body.data).toEqual([]);
		expect(await findSubmission(admin, long.email, long.key)).toBeDefined();
		//* the contact form sets no retention, and neither does the plugin
		expect(
			await findSubmission(admin, unlimited.email as string),
		).toBeDefined();
	});
});
