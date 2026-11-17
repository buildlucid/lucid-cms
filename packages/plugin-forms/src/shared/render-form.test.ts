import { describe, expect, test } from "vitest";
import type { FormField, Form } from "../types.js";
import renderForm from "./render-form.js";

const field = (
	given: Partial<FormField> & Pick<FormField, "name">,
): FormField => ({
	type: "text",
	control: "text",
	label: given.name,
	required: false,
	width: 12,
	help: null,
	placeholder: null,
	defaultValue: null,
	settings: {},
	...given,
});

const form = (given: Partial<Form> = {}): Form => ({
	key: "contact",
	name: "Contact",
	fields: [],
	submitLabel: "Send",
	confirmation: { type: "message", message: "Thanks" },
	action: "https://cms.example.com/api/v1/content/e/forms/contact/submit",
	honeypot: "_gotcha",
	captcha: null,
	...given,
});

describe("renderForm", () => {
	test("escapes everything that comes from the form", () => {
		const html = renderForm(
			form({
				submitLabel: "<b>Go</b>",
				fields: [
					field({
						name: "name",
						label: '"><script>alert(1)</script>',
						placeholder: '" onfocus="alert(1)',
						help: "<img src=x>",
					}),
				],
			}),
			{ script: false },
		);

		expect(html).not.toContain("<script>");
		expect(html).not.toContain("<img");
		expect(html).not.toContain("<b>Go</b>");
		expect(html).toContain('placeholder="&quot; onfocus=&quot;alert(1)"');
	});

	test("says what each part is through data attributes, with no styles or scripts", () => {
		const html = renderForm(
			form({
				fields: [
					field({ name: "first", width: 6, required: true }),
					field({ name: "email", control: "email", width: 6 }),
				],
			}),
			{ script: false },
		);

		expect(html).not.toMatch(/<style|<script|class=|style=/);
		expect(html).toContain(
			'<div data-field="first" data-control="text" data-width="6" data-required>',
		);
		expect(html).toContain(
			'<input id="contact-first" name="first" required aria-describedby="contact-first-error" type="text">',
		);
		//* shown to sighted people, while screen readers read `required`
		expect(html).toContain('first <span aria-hidden="true">*</span></label>');
		expect(html).toContain('autocomplete="email"');
		expect(html).toContain('type="email"');
	});

	test("lets number fields take decimals unless they set a step", () => {
		const number = (settings: Record<string, unknown>) =>
			renderForm(
				form({
					fields: [field({ name: "amount", control: "number", settings })],
				}),
			);

		expect(number({ min: 0 })).toContain('min="0" step="any"');
		expect(number({ step: 5 })).toContain('step="5"');
	});

	test("draws choices as a labelled group, and files as a multipart form", () => {
		const html = renderForm(
			form({
				fields: [
					field({
						name: "plan",
						control: "radio",
						settings: { options: [{ label: "Free", value: "free" }] },
					}),
					field({
						name: "cv",
						control: "file",
						settings: { accept: "pdf, .PNG", maxFiles: 2 },
					}),
				],
			}),
		);

		expect(html).toContain("<fieldset");
		expect(html).toContain(
			'<input id="contact-plan-0" type="radio" name="plan" value="free">',
		);
		expect(html).toContain('enctype="multipart/form-data"');
		expect(html).toContain('accept=".pdf,.png" multiple');
	});

	test("keeps hidden fields out of the layout, and hides the honeypot", () => {
		const html = renderForm(
			form({
				fields: [
					field({ name: "source", control: "hidden", defaultValue: "ad" }),
				],
			}),
		);

		expect(html).toContain('<input type="hidden" name="source" value="ad">');
		expect(html).not.toContain('data-field="source"');
		expect(html).toContain("<div data-honeypot hidden>");
		expect(html).toContain('name="_gotcha" tabindex="-1" autocomplete="off"');
	});

	test("adds the attributes asked for to each part", () => {
		const html = renderForm(
			form({ fields: [field({ name: "first", help: "As on your card" })] }),
			{ attributes: (part) => ({ "data-part": part.part }) },
		);

		expect(html).toContain('data-width="12" data-part="field"');
		expect(html).toContain(
			'<label for="contact-first"><span data-part="label">first</span></label>',
		);
		expect(html).toContain('data-help data-part="help"');
		expect(html).toContain('data-submit data-part="submit"');
	});

	test("shows the form's message in its place once it is sent", () => {
		const html = renderForm(form(), { status: "sent" });

		expect(html).toBe(
			'<div id="form-contact" data-form="contact" data-sent role="status" tabindex="-1"><p>Thanks</p></div>',
		);
	});

	test("sends itself with one inline script, the same for every form", () => {
		const script = (html: string) =>
			html.match(/<script>[\s\S]*<\/script>$/)?.[0];
		const contact = script(renderForm(form()));
		const other = script(renderForm(form({ key: "other", submitLabel: "Go" })));

		expect(contact).toBeDefined();
		expect(contact).toBe(other);
	});

	test("adds the captcha widget with its script, unless the script is off", () => {
		const widget = '<div data-captcha="test"><script>draw()</script></div>';
		const captcha = form({
			captcha: {
				adapter: "test",
				client: {},
				action: "form_submit",
				field: "_captcha",
				widget,
			},
		});

		expect(renderForm(captcha)).toContain(`${widget}<button`);
		expect(renderForm(captcha, { script: false })).not.toContain(
			"data-captcha",
		);
	});

	test("draws fields with markup of their own by type, keeping their parts", () => {
		const html = renderForm(
			form({
				fields: [
					field({ name: "stars", type: "rating", control: "number" }),
					field({ name: "first" }),
				],
			}),
			{
				script: false,
				fields: {
					rating: (_field, parts) =>
						`<div${parts.wrapper}><span id="${parts.id}">${parts.label}</span>${parts.error}</div>`,
					text: (_field, parts) => `<section>${parts.html()}</section>`,
				},
			},
		);

		expect(html).toContain(
			'<div data-field="stars" data-control="number" data-width="12"><span id="contact-stars">stars</span><p id="contact-stars-error" data-error="stars" hidden></p></div>',
		);
		expect(html).toContain('<section><div data-field="first"');
	});

	test("prompts with the label when a dropdown has no placeholder", () => {
		const html = renderForm(
			form({
				fields: [field({ name: "topic", label: "Topic", control: "select" })],
			}),
		);

		expect(html).toContain('<option value="">Topic</option>');
	});
});
