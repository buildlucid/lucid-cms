import { describe, expect, requires, test } from "#harness/vitest";
import {
	CONTACT_FORM_KEY,
	FORMS_TEAM_EMAIL,
	UNSTORED_FORM_KEY,
} from "#shared/config/fragments/forms";
import { createDocument } from "#shared/helpers/documents";
import {
	contactAnswers,
	FORMS_KEY,
	findSubmission,
	formBuilder,
	formPath,
	listSubmissions,
	type FormResponse,
	readSubmission,
	submitForm,
	uniqueFormKey,
} from "#shared/helpers/forms";

describe("reading a form", () => {
	requires("plugin:forms");

	test("gives a website the form's fields without its recipients", async ({
		lucid,
	}) => {
		const read = await lucid
			.session()
			.request<FormResponse>({ path: formPath(CONTACT_FORM_KEY) });

		expect(read.status).toBe(200);
		const form = read.body.data;
		expect(form.fields.map((field) => [field.name, field.control])).toEqual([
			["name", "text"],
			["email", "email"],
			["topic", "select"],
			["seats", "number"],
			["interests", "checkboxes"],
			["message", "textarea"],
			["terms", "checkbox"],
		]);
		expect(form.fields[0]).toMatchObject({
			label: "Your name",
			required: true,
			width: 6,
		});
		expect(form.action).toBe(
			`${lucid.url}${formPath(CONTACT_FORM_KEY)}/submit`,
		);
		expect(JSON.stringify(read.body)).not.toContain(FORMS_TEAM_EMAIL);
		expect(form).not.toHaveProperty("emails");
	});

	test("answers 404 for a key no form has", async ({ lucid }) => {
		const read = await lucid.session().request({ path: formPath("missing") });

		expect(read.status).toBe(404);
	});
});

describe("sending a form", () => {
	requires("plugin:forms");

	test("stores the answers and returns the form's message", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const answers = contactAnswers({ injected: "dropped" });

		const sent = await submitForm(lucid, CONTACT_FORM_KEY, answers);

		expect(sent.status).toBe(200);
		expect(sent.body.data?.confirmation.type).toBe("message");
		const submission = await findSubmission(admin, answers.email as string);
		expect(submission).toMatchObject({ form: CONTACT_FORM_KEY, status: "new" });
		expect(submission?.values.data).toEqual({
			name: "Ada Lovelace",
			email: answers.email,
			topic: "sales",
			seats: 3,
			interests: ["news"],
			message: "Hello there",
			terms: true,
		});
		expect(submission?.values.fields[0]).toMatchObject({
			name: "name",
			label: "Your name",
			type: "text",
		});
	});

	test("takes a posted form's text answers as the types its fields ask for", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const email = contactAnswers().email as string;
		const body = new URLSearchParams({
			name: "  Grace  ",
			email,
			seats: "4",
			message: "Hi",
			terms: "on",
		});
		body.append("interests", "news");
		body.append("interests", "events");

		const sent = await lucid
			.session()
			.fetch(`${formPath(CONTACT_FORM_KEY)}/submit`, {
				method: "POST",
				body,
				headers: { accept: "application/json" },
			});

		expect(sent.status).toBe(200);
		const submission = await findSubmission(admin, email);
		expect(submission?.values.data).toMatchObject({
			name: "Grace",
			seats: 4,
			interests: ["news", "events"],
			topic: null,
			terms: true,
		});
	});

	test("refuses answers that fail their fields' checks, by field name", async ({
		lucid,
	}) => {
		const sent = await submitForm(
			lucid,
			CONTACT_FORM_KEY,
			contactAnswers({
				name: " ",
				email: "not-an-email",
				topic: "billing",
				seats: 50,
				terms: false,
			}),
		);

		expect(sent.status).toBe(400);
		expect(sent.body.errors?.values).toMatchObject({
			name: { code: "required" },
			email: { code: "format" },
			topic: { code: "not_an_option" },
			seats: { code: "too_large" },
			terms: { code: "required" },
		});
		expect(sent.body.errors?.values?.message).toBeUndefined();
	});

	test("refuses a body that isn't a form, rather than storing an empty one", async ({
		lucid,
	}) => {
		const post = (body: string, contentType: string) =>
			lucid.session().fetch(`${formPath(CONTACT_FORM_KEY)}/submit`, {
				method: "POST",
				body,
				headers: { "content-type": contentType },
			});

		expect((await post("{not json", "application/json")).status).toBe(400);
		expect((await post("[]", "Application/JSON")).status).toBe(400);
		expect((await post("name=Ada", "text/plain")).status).toBe(415);
	});

	test("drops a submission that fills the honeypot, without saying so", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const answers = contactAnswers({ _gotcha: "https://spam.example" });

		const sent = await submitForm(lucid, CONTACT_FORM_KEY, answers);

		expect(sent.status).toBe(200);
		expect(sent.body.data?.confirmation.type).toBe("message");
		expect(
			await findSubmission(admin, answers.email as string),
		).toBeUndefined();
	});

	test("sends a browser that posted the form itself back to its page", async ({
		lucid,
	}) => {
		const post = (values: Record<string, string>) =>
			lucid.session().fetch(`${formPath(CONTACT_FORM_KEY)}/submit`, {
				method: "POST",
				body: new URLSearchParams(values),
				headers: {
					accept: "text/html",
					referer: "https://site.example/contact?utm=1",
				},
				redirect: "manual",
			});

		const sent = await post({
			name: "Ada",
			email: contactAnswers().email as string,
			message: "Hi",
			terms: "on",
		});
		const refused = await post({ name: "Ada" });

		expect(sent.status).toBe(303);
		expect(sent.headers.get("location")).toBe(
			`https://site.example/contact?utm=1&form=${CONTACT_FORM_KEY}&status=sent#form-${CONTACT_FORM_KEY}`,
		);
		expect(refused.status).toBe(303);
		expect(refused.headers.get("location")).toBe(
			`https://site.example/contact?utm=1&form=${CONTACT_FORM_KEY}&status=error#form-${CONTACT_FORM_KEY}`,
		);
	});

	test("sends a browser on another origin back to the page the form names, if it is on that site", async ({
		lucid,
	}) => {
		//* browsers posting to another origin only say which site they came from
		const post = (returnUrl: string) =>
			lucid.session().fetch(`${formPath(CONTACT_FORM_KEY)}/submit`, {
				method: "POST",
				body: new URLSearchParams({ name: "Ada", _return: returnUrl }),
				headers: {
					accept: "text/html",
					origin: "https://site.example",
					referer: "https://site.example/",
				},
				redirect: "manual",
			});

		const named = await post("/contact?utm=1");
		const elsewhere = await post("https://other.example/contact");

		expect(named.headers.get("location")).toBe(
			`https://site.example/contact?utm=1&form=${CONTACT_FORM_KEY}&status=error#form-${CONTACT_FORM_KEY}`,
		);
		expect(elsewhere.headers.get("location")).toBe(
			`https://site.example/?form=${CONTACT_FORM_KEY}&status=error#form-${CONTACT_FORM_KEY}`,
		);
	});

	test("sends a form that doesn't store its submissions, without keeping a submission", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const sent = await submitForm(lucid, UNSTORED_FORM_KEY, {
			phone: "+44 20 7946 0000",
		});

		expect(sent.status).toBe(200);
		expect(sent.body.data?.confirmation).toEqual({
			type: "redirect",
			url: "/thanks",
		});
		expect(await listSubmissions(admin, UNSTORED_FORM_KEY)).toEqual([]);
	});
});

describe("a submission's emails", () => {
	requires("plugin:forms", "harness:outbox");

	test("go to the team and the visitor with answers in place of tokens", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const answers = contactAnswers({ name: "Katherine" });

		await submitForm(lucid, CONTACT_FORM_KEY, answers);

		const reply = await lucid.email({
			to: answers.email as string,
			template: "forms-submission",
		});
		expect(reply.subject).toBe("Thanks, Katherine");
		const team = (
			await lucid.emails({
				to: FORMS_TEAM_EMAIL,
				template: "forms-submission",
			})
		).find((email) => email.subject === "Enquiry from Katherine");
		expect(team?.data).toMatchObject({
			title: "Contact",
			paragraphs: ["Katherine asked about Sales."],
		});
		//* replies to the team's copy go to the visitor
		expect(team?.replyTo).toBe(answers.email);
		expect(team?.data.rows).toContainEqual({
			label: "Email",
			value: answers.email,
		});
		const stored = await findSubmission(admin, answers.email as string);
		expect(stored).toBeDefined();
		const submission = await readSubmission(admin, stored?.id ?? 0);
		expect(submission.emails).toHaveLength(2);
	});

	test("go only to the addresses an editor's entry comes out as, one each", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("referral");
		await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key,
				bricks: [build.field(0, "text", { name: "friend", required: true })],
				fields: [
					{
						key: "emails",
						type: "repeater",
						groups: [
							{
								ref: "email-0",
								order: 0,
								fields: [
									{ key: "to", type: "text", value: "{{friend}}" },
									build.text("subject", "You were referred"),
								],
							},
						],
					},
				],
			}),
		);
		const one = `${key}-one@example.com`;
		const two = `${key}-two@example.com`;

		//* an answer holding two addresses is no address, so it can't widen who the email goes to
		const many = await submitForm(lucid, key, { friend: `${one}, ${two}` });
		expect(many.status).toBe(200);
		const single = await submitForm(lucid, key, { friend: two });
		expect(single.status).toBe(200);

		const sent = await lucid.email({ to: two, template: "forms-submission" });
		expect(sent.subject).toBe("You were referred");
		expect(
			await lucid.emails({ to: one, template: "forms-submission" }),
		).toEqual([]);
		expect(
			await lucid.emails({
				to: `${one},${two}`,
				template: "forms-submission",
			}),
		).toEqual([]);
	});
});
