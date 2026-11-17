import { renderForm } from "@lucidcms/forms";
import { expect, requires, test } from "#harness/playwright";
import { CONTACT_FORM_KEY } from "#shared/config/fragments/forms";
import { createDocument } from "#shared/helpers/documents";
import {
	contactAnswers,
	FORMS_KEY,
	findSubmission,
	formBuilder,
	formPath,
	type FormResponse,
	SUBMISSIONS_KEY,
	submitForm,
	uniqueFormKey,
} from "#shared/helpers/forms";

test.describe("forms in the admin", () => {
	requires("plugin:forms");

	test("shows a submission's answers under their fields' labels", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const answers = contactAnswers({ message: "Is the workshop still on?" });
		await submitForm(lucid, CONTACT_FORM_KEY, answers);
		const submission = await findSubmission(admin, answers.email as string);

		await page.goto(
			`/admin/collections/${SUBMISSIONS_KEY}/latest/${submission?.id}`,
		);

		const answer = (label: string) =>
			page.locator("dl > div").filter({
				has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }),
			});
		await expect(answer("Your name")).toContainText("Ada Lovelace");
		await expect(answer("Message")).toContainText("Is the workshop still on?");
		await expect(answer("Topic")).toContainText("sales");
	});

	test("previews the form being built, with its fields picked on the page", async ({
		page,
		lucid,
	}) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const id = await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key: uniqueFormKey("previewed"),
				bricks: [
					build.field(0, "text", { name: "first", label: "First name" }),
					build.field(1, "select", {
						name: "plan",
						label: "Plan",
						settings: [build.choices(["free", "paid"])],
					}),
				],
			}),
		);

		await page.goto(`/admin/collections/${FORMS_KEY}/latest/${id}`);
		await expect(page.getByRole("button", { name: "Add Field" })).toBeVisible();
		await page.getByTitle(/^Preview/).click();

		const preview = page.frameLocator('iframe[name="lucid-preview"]');
		await expect(preview.getByLabel("First name")).toBeVisible();
		await expect(preview.getByLabel("Plan")).toContainText("PAID");
		await expect(preview.getByRole("button", { name: "Send" })).toBeVisible();
		//* each field is marked as the brick it comes from, which is what lets the page pick and move it
		await expect(preview.locator("[data-field][data-lucid-edit]")).toHaveCount(
			2,
		);
	});

	test("shows the markup websites get for a form", async ({ page, lucid }) => {
		const admin = await lucid.admin();
		const build = formBuilder(lucid);
		const key = uniqueFormKey("markup");
		const id = await createDocument(
			admin,
			FORMS_KEY,
			build.form({
				key,
				bricks: [
					build.field(0, "text", { name: "first", label: "First name" }),
				],
			}),
		);

		await page.goto(`/admin/collections/${FORMS_KEY}/latest/${id}`);
		await page.getByTitle(/^Preview/).click();
		await page.getByRole("button", { name: "Form markup" }).click();

		const modal = page.getByRole("dialog");
		await expect(modal.locator("[data-code-block]")).toContainText(
			`data-form="${key}"`,
		);
		await modal.getByRole("tab", { name: "Your own script" }).click();
		await expect(modal.locator("[data-code-block]")).toContainText(
			"new FormData(form)",
		);
	});

	test("sends itself in place with its inline script", async ({
		page,
		lucid,
	}) => {
		const read = await lucid
			.session()
			.request<FormResponse>({ path: formPath(CONTACT_FORM_KEY) });
		//* on the CMS's origin, which the form posts to
		await page.goto(formPath(CONTACT_FORM_KEY));
		await page.setContent(
			renderForm(read.body.data as Parameters<typeof renderForm>[0]),
		);
		//* past the browser's own checks, to reach the server's
		await page.locator("form").evaluate((form) => {
			form.setAttribute("novalidate", "");
		});

		await page.getByRole("button", { name: "Send" }).click();
		await expect(page.locator('[data-error="name"]')).toBeVisible();
		await expect(page.locator("#contact-name")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		await expect(page.locator("#contact-name")).toBeFocused();

		await page.locator("#contact-name").fill("Ada Lovelace");
		await page
			.locator("#contact-email")
			.fill(`ada-${crypto.randomUUID()}@example.com`);
		await page.locator("#contact-message").fill("Hello from the page");
		await page.locator("#contact-terms").check();
		await page.getByRole("button", { name: "Send" }).click();

		await expect(page.locator("[data-sent]")).toBeFocused();
		await expect(page.locator("form")).toHaveCount(0);
	});

	test("waits for its captcha widget's token, and resets it after a failed send", async ({
		page,
		lucid,
	}) => {
		const read = await lucid
			.session()
			.request<FormResponse>({ path: formPath(CONTACT_FORM_KEY) });
		//* a widget that writes a new token each time it is asked, and counts its resets
		const widget = `
			const slot = document.currentScript.parentElement;
			const input = Object.assign(document.createElement("input"), { type: "hidden", name: "_captcha" });
			slot.append(input);
			let tokens = 0;
			slot.addEventListener("captcha:token", (event) => event.detail(
				new Promise((resolve) => setTimeout(() => { input.value = "token-" + ++tokens; resolve(); }, 50)),
			));
			slot.addEventListener("captcha:reset", () => { slot.dataset.resets = String(Number(slot.dataset.resets ?? 0) + 1); });
		`;
		await page.goto(formPath(CONTACT_FORM_KEY));
		await page.setContent(
			renderForm({
				...(read.body.data as Parameters<typeof renderForm>[0]),
				captcha: {
					adapter: "test",
					client: {},
					action: "form_submit",
					field: "_captcha",
					widget: `<div data-captcha="test"><script>${widget}</script></div>`,
				},
			}),
		);
		await page.locator("form").evaluate((form) => {
			form.setAttribute("novalidate", "");
		});

		const sent = page.waitForRequest((request) => request.method() === "POST");
		await page.getByRole("button", { name: "Send" }).click();

		expect((await sent).postData()).toContain("token-1");
		await expect(page.locator("[data-captcha]")).toHaveAttribute(
			"data-resets",
			"1",
		);
	});
});
