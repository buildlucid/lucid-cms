import { describe, expect, requires, test } from "#harness/vitest";
import { CONTACT_FORM_KEY } from "#shared/config/fragments/forms";
import { createDocument, saveDocument } from "#shared/helpers/documents";
import {
	contactAnswers,
	FORMS_KEY,
	findSubmission,
	formBuilder,
	readSubmission,
	SUBMISSIONS_KEY,
	submitForm,
	uniqueFormKey,
} from "#shared/helpers/forms";

type Notification = { title: string; body: string | null; href: string | null };

describe("stored submissions", () => {
	requires("plugin:forms");

	test("notify people who can read them, with a link to the submission", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const answers = contactAnswers();

		await submitForm(lucid, CONTACT_FORM_KEY, answers);

		const submission = await findSubmission(admin, answers.email as string);
		const listed = await admin.request<{ data: Notification[] }>({
			path: "/api/v1/notifications",
			query: { "filter[type]": "forms:submission-received", perPage: 100 },
		});
		expect(listed.status).toBe(200);
		expect(listed.body.data).toContainEqual(
			expect.objectContaining({
				title: "New Contact submission",
				body: answers.email,
				href: `/admin/collections/form-submissions/latest/${submission?.id}`,
			}),
		);
	});

	test("export as CSV with a column per field, safe to open in a spreadsheet", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("export");
		await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key,
				bricks: [
					build.field(0, "text", { name: "name", label: "Full name" }),
					build.field(1, "textarea", { name: "note", label: "Note" }),
				],
			}),
		);
		await submitForm(lucid, key, { name: "Ada", note: 'She said "hi", twice' });
		await submitForm(lucid, key, { name: "=SUM(A1)", note: "" });

		const exported = await admin.request<{
			data: { fileName: string; csv: string };
		}>({
			path: "/api/v1/forms/submissions/export",
			query: { form: key },
		});

		expect(exported.status).toBe(200);
		expect(exported.body.data.fileName).toBe(`${key}-submissions.csv`);
		const [header, first, second] = exported.body.data.csv.split("\r\n");
		expect(header).toBe("Sent,Status,Full name,Note");
		expect(first).toMatch(/,new,Ada,"She said ""hi"", twice"$/);
		expect(second).toMatch(/,new,'=SUM\(A1\),$/);
	});

	test("can't be exported without access to them", async ({ lucid }) => {
		const member = await lucid.user({ permissions: [] });

		const exported = await member.session.request({
			path: "/api/v1/forms/submissions/export",
			query: { form: CONTACT_FORM_KEY },
		});

		expect(exported.status).toBe(403);
	});

	test("are added and written by the form alone, leaving people their status", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const answers = contactAnswers();
		await submitForm(lucid, CONTACT_FORM_KEY, answers);
		const submission = await findSubmission(admin, answers.email as string);
		const id = submission?.id ?? 0;

		const created = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${SUBMISSIONS_KEY}`,
			body: {
				fields: [
					{ key: "summary", type: "text", value: "Made by hand" },
					{ key: "form", type: "text", value: CONTACT_FORM_KEY },
				],
			},
		});
		expect(created.status).toBe(403);

		await saveDocument(admin, SUBMISSIONS_KEY, id, {
			fields: [
				{ key: "summary", type: "text", value: "Rewritten" },
				{ key: "status", type: "select", value: "spam" },
				{ key: "values", type: "json", value: { data: {}, fields: [] } },
			],
		});

		const saved = await readSubmission(admin, id);
		expect(saved.status).toBe("spam");
		expect(saved.summary).toBe(answers.email);
		expect(saved.values).toEqual(submission?.values);
	});
});
