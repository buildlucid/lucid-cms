import { CAPTCHA_TOKEN } from "#harness/client";
import { describe, expect, requires, test, useVariant } from "#harness/vitest";
import { CAPTCHA_ADAPTER_KEY } from "#shared/config/fragments/auth";
import { CONTACT_FORM_KEY } from "#shared/config/fragments/forms";
import {
	contactAnswers,
	findSubmission,
	formPath,
	type FormResponse,
	submitForm,
} from "#shared/helpers/forms";

useVariant("captcha");
requires("plugin:forms");

const CAPTCHA_HEADER = "lucid-captcha-token";

describe("a form's captcha", () => {
	test("is named in the form, for the website to draw its widget", async ({
		lucid,
	}) => {
		const read = await lucid
			.session()
			.request<FormResponse>({ path: formPath(CONTACT_FORM_KEY) });

		expect(read.body.data.captcha).toMatchObject({
			adapter: CAPTCHA_ADAPTER_KEY,
			action: "form_submit",
			field: "_captcha",
		});
	});

	test("refuses a missing or failed token, and stores nothing", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const answers = contactAnswers();

		const missing = await submitForm(lucid, CONTACT_FORM_KEY, answers);
		const failed = await submitForm(lucid, CONTACT_FORM_KEY, answers, {
			headers: { [CAPTCHA_HEADER]: "not-a-pass" },
		});

		expect(missing.status).toBe(400);
		expect(failed.status).toBe(403);
		expect(
			await findSubmission(admin, answers.email as string),
		).toBeUndefined();
	});

	test("takes a passing token from the header or the form's own field", async ({
		lucid,
	}) => {
		const fromHeader = await submitForm(
			lucid,
			CONTACT_FORM_KEY,
			contactAnswers(),
			{ headers: { [CAPTCHA_HEADER]: CAPTCHA_TOKEN } },
		);
		const fromField = await submitForm(
			lucid,
			CONTACT_FORM_KEY,
			contactAnswers({ _captcha: CAPTCHA_TOKEN }),
		);

		expect(fromHeader.status).toBe(200);
		expect(fromField.status).toBe(200);
	});

	test("reports refused answers before it asks for a token", async ({
		lucid,
	}) => {
		const refused = await submitForm(
			lucid,
			CONTACT_FORM_KEY,
			contactAnswers({ email: "not-an-email" }),
		);

		expect(refused.status).toBe(400);
		expect(refused.body.errors?.values?.email?.code).toBe("format");
	});
});
