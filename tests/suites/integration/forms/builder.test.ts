import { describe, expect, requires, test } from "#harness/vitest";
import { CONTACT_FORM_KEY } from "#shared/config/fragments/forms";
import { createDocument, publishDocument } from "#shared/helpers/documents";
import {
	FORMS_KEY,
	findSubmission,
	formBuilder,
	listSubmissions,
	formPath,
	type FormResponse,
	submitForm,
	uniqueFormKey,
} from "#shared/helpers/forms";

describe("forms editors build", () => {
	requires("plugin:forms");

	test("are read with their fields in order, with widths and choices", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("survey");
		await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key,
				name: "Survey",
				bricks: [
					build.field(0, "text", { name: "first", label: "First", width: 6 }),
					build.field(1, "email", { name: "email", required: true, width: 6 }),
					build.field(2, "radio", {
						name: "plan",
						settings: [build.choices(["free", "paid"])],
					}),
				],
			}),
		);

		const read = await lucid
			.session()
			.request<FormResponse>({ path: formPath(key) });

		expect(read.status).toBe(200);
		expect(read.body.data).toMatchObject({
			key,
			name: "Survey",
			submitLabel: "Send",
			confirmation: { type: "message" },
		});
		expect(
			read.body.data.fields.map((field) => ({
				name: field.name,
				control: field.control,
				width: field.width,
				required: field.required,
			})),
		).toEqual([
			{ name: "first", control: "text", width: 6, required: false },
			{ name: "email", control: "email", width: 6, required: true },
			{ name: "plan", control: "radio", width: 12, required: false },
		]);
		expect(read.body.data.fields[2]?.settings.options).toEqual([
			{ label: "FREE", value: "free" },
			{ label: "PAID", value: "paid" },
		]);
	});

	test("check and store what is sent to them", async ({ lucid }) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("signup");
		await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key,
				bricks: [
					build.field(0, "email", { name: "email", required: true }),
					build.field(1, "select", {
						name: "plan",
						settings: [build.choices(["free", "paid"])],
					}),
				],
			}),
		);
		const email = `${key}@example.com`;

		const refused = await submitForm(lucid, key, { email, plan: "gold" });
		const sent = await submitForm(lucid, key, { email, plan: "paid" });

		expect(refused.status).toBe(400);
		expect(refused.body.errors?.values).toMatchObject({
			plan: { code: "not_an_option" },
		});
		expect(sent.status).toBe(200);
		expect((await findSubmission(admin, email, key))?.values.data).toEqual({
			email,
			plan: "paid",
		});
	});

	test("can't repeat a field name", async ({ lucid }) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);

		const created = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${FORMS_KEY}`,
			body: build.form({
				key: uniqueFormKey("repeat"),
				bricks: [
					build.field(0, "text", { name: "name" }),
					build.field(1, "email", { name: "name" }),
				],
			}),
		});

		expect(created.status).toBe(400);
	});

	test("can't take another form's key, or a code-defined form's", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("taken");
		const create = (formKey: string) =>
			admin.request({
				method: "POST",
				path: `/api/v1/documents/${FORMS_KEY}`,
				body: build.form({
					key: formKey,
					bricks: [build.field(0, "text", { name: "name" })],
				}),
			});

		expect((await create(key)).status).toBe(201);
		expect((await create(key)).status).toBe(400);
		expect((await create(CONTACT_FORM_KEY)).status).toBe(400);
	});

	test("can't redirect to anything but a website path or a web address", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const create = (url: string) =>
			admin.request({
				method: "POST",
				path: `/api/v1/documents/${FORMS_KEY}`,
				body: build.form({
					key: uniqueFormKey("redirect"),
					bricks: [build.field(0, "text", { name: "name" })],
					fields: [
						{ key: "confirmationType", type: "select", value: "redirect" },
						build.text("redirectUrl", url),
					],
				}),
			});

		expect((await create("javascript:alert(1)")).status).toBe(400);
		expect((await create("//other.example")).status).toBe(400);
		expect((await create("/thanks")).status).toBe(201);
		expect((await create("https://example.com/thanks")).status).toBe(201);
	});

	test("can't be restored once another form has their key", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("restored");
		const form = build.form({
			key,
			bricks: [build.field(0, "text", { name: "name" })],
		});
		const first = await createDocument(admin, FORMS_KEY, form);
		const restore = () =>
			admin.request({
				method: "POST",
				path: `/api/v1/documents/${FORMS_KEY}/restore`,
				body: { ids: [first] },
			});
		const bin = () =>
			admin.request({
				method: "DELETE",
				path: `/api/v1/documents/${FORMS_KEY}/${first}`,
			});

		expect((await bin()).status).toBe(204);
		expect((await restore()).status).toBe(204);

		expect((await bin()).status).toBe(204);
		await createDocument(admin, FORMS_KEY, form);
		expect((await restore()).status).toBe(400);
	});

	test("must store their submissions to take files", async ({ lucid }) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);

		const created = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${FORMS_KEY}`,
			body: build.form({
				key: uniqueFormKey("files"),
				bricks: [build.field(0, "upload", { name: "cv" })],
				fields: [{ key: "store", type: "checkbox", value: false }],
			}),
		});

		expect(created.status).toBe(400);
	});
});

describe("localized forms", () => {
	requires("plugin:forms", "feature:localization");

	test("are read in the locale asked for, or the default", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("locale");
		await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key,
				bricks: [
					build.field(0, "text", {
						name: "name",
						label: { en: "Name", fr: "Nom" },
					}),
				],
			}),
		);
		const read = async (locale?: string) =>
			(
				await lucid.session().request<FormResponse>({
					path: formPath(key),
					query: locale ? { locale } : undefined,
				})
			).body.data;

		expect((await read()).fields[0]?.label).toBe("Name");
		const french = await read("fr");
		expect(french.fields[0]?.label).toBe("Nom");

		//* the form posts where it was read from, so what is stored matches what the visitor saw
		const action = new URL(french.action);
		expect(action.searchParams.get("locale")).toBe("fr");
		const name = `Locale ${key}`;
		const sent = await lucid.session().fetch(action.pathname + action.search, {
			method: "POST",
			body: JSON.stringify({ name }),
			headers: { "content-type": "application/json" },
		});
		expect(sent.status).toBe(200);
		expect(
			(await findSubmission(admin, name, key))?.values.fields[0]?.label,
		).toBe("Nom");
	});

	test("are read from the environment asked for, and their submissions record it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("staged");
		const id = await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key,
				bricks: [build.field(0, "email", { name: "email", required: true })],
			}),
		);
		const read = (version: string) =>
			lucid.session().request<FormResponse>({
				path: formPath(key),
				query: { version },
			});

		//* not published there yet, and nowhere outside the collection's environments
		const unpublished = await read("production");
		expect(unpublished.status).toBe(404);
		expect(unpublished.body).toMatchObject({
			name: "Form Not Found",
			code: "not_found",
		});
		expect((await read("staging")).status).toBe(400);

		await publishDocument(admin, FORMS_KEY, id, "production");
		const published = await read("production");
		expect(published.status).toBe(200);
		expect(published.body.data.action).toContain("version=production");

		const sent = await lucid.session().request({
			method: "POST",
			path: `${formPath(key)}/submit`,
			query: { version: "production" },
			body: { email: "staged@example.com" },
			csrf: false,
		});
		expect(sent.status).toBe(200);
		await submitForm(lucid, key, { email: "latest@example.com" });

		const submissions = await listSubmissions(admin, key);
		expect(
			Object.fromEntries(
				submissions.map((item) => [item.summary, item.environment]),
			),
		).toEqual({
			"staged@example.com": "production",
			"latest@example.com": undefined,
		});
	});
});
