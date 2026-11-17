import { defineSeed, LucidError } from "@lucidcms/core";
import type {
	Toolkit,
	ToolkitDocumentsCreateSingleInput,
} from "@lucidcms/core/types";

type FormData = ToolkitDocumentsCreateSingleInput<"forms">["data"];

/** A choice field's options, from each value and its label. */
const choices = (labels: Record<string, string>) =>
	Object.entries(labels).map(([value, label]) => ({
		fields: { label, value },
	}));

/** Forms for trying the builder, the lab page and submissions. Each is skipped once its key exists. */
const forms: FormData[] = [
	{
		fields: {
			name: "Newsletter",
			key: "newsletter",
			submitLabel: "Subscribe",
			confirmationType: "message",
			confirmationMessage: "You're on the list.",
			notify: false,
		},
		bricks: {
			builder: [
				{
					key: "form-email",
					fields: {
						fieldName: "email",
						fieldLabel: "Email address",
						fieldRequired: true,
						fieldWidth: "8",
						fieldPlaceholder: "you@example.com",
					},
				},
				{
					key: "form-text",
					fields: {
						fieldName: "firstName",
						fieldLabel: "First name",
						fieldWidth: "4",
					},
				},
				{
					key: "form-checkbox",
					fields: {
						fieldName: "consent",
						fieldLabel: "Send me the monthly newsletter",
						fieldRequired: true,
						fieldHelp: "You can unsubscribe at any time.",
					},
				},
				{
					key: "form-hidden",
					fields: {
						fieldName: "source",
						fieldLabel: "Source",
						fieldDefaultValue: "lab-page",
					},
				},
			],
		},
	},
	{
		fields: {
			name: "Job application",
			key: "job-application",
			submitLabel: "Apply",
			confirmationType: "message",
			confirmationMessage: "Thanks for applying. We'll reply within a week.",
			retentionDays: 90,
			emails: [
				{
					fields: {
						to: "jobs@example.com",
						replyTo: "{{email}}",
						subject: "Application from {{name}} for {{role}}",
						message: "A new application came in through the website.",
					},
				},
				{
					fields: {
						to: "{{email}}",
						subject: "We have your application",
						message: "Thanks {{name}}, here is a copy of what you sent.",
					},
				},
			],
		},
		bricks: {
			builder: [
				{
					key: "form-text",
					fields: {
						fieldName: "name",
						fieldLabel: "Full name",
						fieldRequired: true,
						fieldWidth: "6",
					},
				},
				{
					key: "form-email",
					fields: {
						fieldName: "email",
						fieldLabel: "Email",
						fieldRequired: true,
						fieldWidth: "6",
					},
				},
				{
					key: "form-phone",
					fields: {
						fieldName: "phone",
						fieldLabel: "Phone",
						fieldWidth: "6",
					},
				},
				{
					key: "form-select",
					fields: {
						fieldName: "role",
						fieldLabel: "Role",
						fieldRequired: true,
						fieldWidth: "6",
						fieldPlaceholder: "Choose a role",
						options: choices({
							engineer: "Engineer",
							designer: "Designer",
							writer: "Technical writer",
						}),
					},
				},
				{
					key: "form-date",
					fields: {
						fieldName: "startDate",
						fieldLabel: "Earliest start date",
						fieldWidth: "6",
					},
				},
				{
					key: "form-url",
					fields: {
						fieldName: "portfolio",
						fieldLabel: "Portfolio",
						fieldWidth: "6",
						fieldPlaceholder: "https://",
					},
				},
				{
					key: "form-textarea",
					fields: {
						fieldName: "coverLetter",
						fieldLabel: "Cover letter",
						fieldRequired: true,
						fieldHelp: "A few paragraphs is plenty.",
						rows: 6,
						maxLength: 2000,
					},
				},
				{
					key: "form-upload",
					fields: {
						fieldName: "cv",
						fieldLabel: "CV",
						fieldRequired: true,
						fieldHelp: "PDF or Word, up to 5 MB.",
						accept: "pdf, doc, docx",
						maxFiles: 1,
						maxSizeMb: 5,
					},
				},
			],
		},
	},
	{
		fields: {
			name: "Event booking",
			key: "event-booking",
			submitLabel: "Book",
			confirmationType: "redirect",
			redirectUrl: "/en/lab",
			emails: [
				{
					fields: {
						to: "events@example.com",
						replyTo: "{{email}}",
						subject: "{{tickets}} tickets for {{name}}",
					},
				},
			],
		},
		bricks: {
			builder: [
				{
					key: "form-text",
					fields: {
						fieldName: "name",
						fieldLabel: "Name",
						fieldRequired: true,
						fieldWidth: "6",
					},
				},
				{
					key: "form-email",
					fields: {
						fieldName: "email",
						fieldLabel: "Email",
						fieldRequired: true,
						fieldWidth: "6",
					},
				},
				{
					key: "form-number",
					fields: {
						fieldName: "tickets",
						fieldLabel: "Tickets",
						fieldRequired: true,
						fieldWidth: "4",
						fieldDefaultValue: "1",
						min: 1,
						max: 6,
						step: 1,
					},
				},
				{
					key: "form-radio",
					fields: {
						fieldName: "day",
						fieldLabel: "Day",
						fieldRequired: true,
						fieldWidth: "8",
						options: choices({ friday: "Friday", saturday: "Saturday" }),
					},
				},
				{
					key: "form-checkboxes",
					fields: {
						fieldName: "sessions",
						fieldLabel: "Sessions",
						fieldHelp: "Pick any that interest you.",
						options: choices({
							keynote: "Keynote",
							workshop: "Workshop",
							social: "Evening social",
						}),
					},
				},
				{
					key: "form-textarea",
					fields: {
						fieldName: "notes",
						fieldLabel: "Anything we should know?",
						fieldPlaceholder: "Access needs, dietary requirements",
					},
				},
			],
		},
	},
];

const hasForm = async (toolkit: Toolkit, key: string) => {
	const found = await toolkit.documents.getMultiple({
		collectionKey: "forms",
		version: "latest",
		filter: { fields: { key } },
		perPage: 1,
	});
	if (found.error) throw new LucidError(found.error);
	return found.data.items.length > 0;
};

const formsSeed = defineSeed({
	run: async ({ toolkit }) => {
		for (const form of forms) {
			const key = form.fields?.key;
			if (!key || (await hasForm(toolkit, key))) continue;

			const created = await toolkit.documents.createSingle({
				collectionKey: "forms",
				actor: { type: "system" },
				data: form,
			});
			if (created.error) throw new LucidError(created.error);
		}
	},
});

export default formsSeed;
