import { defineForm, formField, forms } from "@lucidcms/forms";

/** Where the code-defined contact form sends its emails. */
export const FORMS_TEAM_EMAIL = "forms-team@example.com";

/** A code-defined form with a field of most kinds, a team email and a reply to the visitor. */
export const CONTACT_FORM_KEY = "contact";
/** A code-defined form that sends its email without keeping the submission. */
export const UNSTORED_FORM_KEY = "callback";
/** A code-defined form that takes one PDF or text file. */
export const UPLOAD_FORM_KEY = "application";

const contact = defineForm({
	key: CONTACT_FORM_KEY,
	name: "Contact",
	fields: [
		formField.text("name", { label: "Your name", required: true, width: 6 }),
		formField.email("email", { label: "Email", required: true, width: 6 }),
		formField.select("topic", {
			label: "Topic",
			options: [
				{ label: "Sales", value: "sales" },
				{ label: "Support", value: "support" },
			],
		}),
		formField.number("seats", { label: "Seats", min: 1, max: 10 }),
		formField.checkboxes("interests", {
			label: "Interests",
			options: [
				{ label: "News", value: "news" },
				{ label: "Events", value: "events" },
			],
		}),
		formField.textarea("message", { label: "Message", required: true }),
		formField.checkbox("terms", { label: "I agree", required: true }),
	],
	emails: [
		{
			to: FORMS_TEAM_EMAIL,
			subject: "Enquiry from {{name}}",
			message: "{{name}} asked about {{topic}}.",
			replyTo: "{{email}}",
		},
		{ to: "{{email}}", subject: "Thanks, {{name}}" },
	],
});

const callback = defineForm({
	key: UNSTORED_FORM_KEY,
	name: "Callback",
	store: false,
	notify: false,
	fields: [formField.phone("phone", { label: "Phone", required: true })],
	confirmation: { type: "redirect", url: "/thanks" },
	emails: [{ to: FORMS_TEAM_EMAIL, subject: "Call {{phone}}" }],
});

const application = defineForm({
	key: UPLOAD_FORM_KEY,
	name: "Application",
	notify: false,
	fields: [
		formField.text("name", { label: "Name", required: true }),
		formField.upload("cv", {
			label: "CV",
			required: true,
			accept: ["pdf", "txt"],
			maxSizeMb: 1,
		}),
	],
});

/**
 * The forms plugin with its builder and submissions collections and three code-defined forms.
 * Gives `plugin:forms`. `localized` translates builder forms, for setups with locales.
 */
export const formsPlugin = (options: { localized?: boolean } = {}) =>
	forms({
		definitions: [contact, callback, application],
		builder: {
			localized: options.localized ?? false,
			//* websites get latest unless they ask for production, so most tests need not publish
			publishing: {
				environments: [{ key: "production", label: "Production" }],
			},
			version: "latest",
		},
		submissions: true,
		//* tests post from many visitors, each with their own address
		rateLimit: { limit: 5, windowMs: 60_000 },
	});
