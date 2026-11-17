import { copy, defineCollection, field, z } from "@lucidcms/core";
import {
	confirmationTypes,
	FORMS_COLLECTION_KEY,
	formDefaults,
	formFields,
	keyPattern,
	routes,
} from "../../constants.js";
import isSafeRedirect from "../../shared/is-safe-redirect.js";
import type {
	FormsBuilderOptionsInternal,
	FormsPluginOptionsInternal,
} from "../parse-plugin-options.js";
import createFieldBrick from "./create-field-brick.js";

const keySchema = z
	.string()
	.trim()
	.regex(
		keyPattern,
		"Start with a letter, then use letters, numbers, hyphens and underscores.",
	);

const redirectSchema = z
	.string()
	.trim()
	.refine(
		isSafeRedirect,
		"Enter a path on your website beginning with a slash, or a full address beginning with http:// or https://.",
	);

/** When the given field is set to one of the confirmation types. */
const whenConfirmation = (type: keyof typeof confirmationTypes) => ({
	all: [
		{
			field: formFields.confirmationType,
			operator: "equals" as const,
			value: confirmationTypes[type],
		},
	],
});

/**
 * Creates the collection editors build forms in: a builder brick per field type, and tabs for
 * the form itself, the emails it sends and its submissions. Captcha and storage settings only
 * show when the project has them.
 */
const createFormsCollection = (
	options: FormsPluginOptionsInternal,
	builder: FormsBuilderOptionsInternal,
	features: {
		captcha: boolean;
		/** The CMS's address, which serves the page the builder's preview frames. */
		url: string;
	},
) =>
	defineCollection({
		key: FORMS_COLLECTION_KEY,
		mode: "multiple",
		group: builder.group,
		details: {
			labels: {
				singular: copy("admin:plugin.forms.collection.singular"),
				plural: copy("admin:plugin.forms.collection.plural"),
				addBrick: copy("admin:plugin.forms.builder.add"),
			},
			description: copy("admin:plugin.forms.collection.description"),
		},
		ai: {
			instructions:
				"A form for the website. Each builder brick is one field, in the order visitors see them. Field names must be unique within the form: they key each answer in submissions and are the {{name}} tokens emails can use. Widths are columns of a 12-column grid, so two fields of width 6 sit side by side.",
		},
		localized: builder.localized,
		revisions: true,
		publishing: builder.publishing,
		preview: {
			url: ({ locale }) => {
				const page = new URL(routes.preview, features.url);
				if (locale !== null) page.searchParams.set("locale", locale);
				return page;
			},
		},
		bricks: {
			builder: [...options.fieldTypes.values()].map(createFieldBrick),
		},
		fields: [
			field.tab("details", {
				details: { label: copy("admin:plugin.forms.tabs.details") },
				fields: [
					field.text(formFields.name, {
						details: { label: copy("admin:plugin.forms.fields.name.label") },
						localized: false,
						validation: { required: true },
						ui: { width: 6 },
						useAsLabel: true,
						showInList: true,
					}),
					field.text(formFields.key, {
						details: {
							label: copy("admin:plugin.forms.fields.key.label"),
							description: copy("admin:plugin.forms.fields.key.description"),
						},
						localized: false,
						index: true,
						validation: { required: true, zod: keySchema },
						ui: { width: 6 },
						showInList: true,
					}),
					field.text(formFields.submitLabel, {
						details: {
							label: copy("admin:plugin.forms.fields.submit.label.label"),
							placeholder: formDefaults.submitLabel,
						},
						localized: true,
						ui: { width: 6 },
					}),
					field.select(formFields.confirmationType, {
						details: {
							label: copy("admin:plugin.forms.fields.confirmation.type.label"),
						},
						options: [
							{
								label: copy("admin:plugin.forms.confirmation.type.message"),
								value: confirmationTypes.message,
							},
							{
								label: copy("admin:plugin.forms.confirmation.type.redirect"),
								value: confirmationTypes.redirect,
							},
						],
						default: confirmationTypes.message,
						validation: { required: true },
						ui: { width: 6 },
					}),
					field.textarea(formFields.confirmationMessage, {
						details: {
							label: copy(
								"admin:plugin.forms.fields.confirmation.message.label",
							),
							placeholder: formDefaults.confirmationMessage,
						},
						localized: true,
						ui: { condition: whenConfirmation("message") },
					}),
					field.text(formFields.redirectUrl, {
						details: {
							label: copy("admin:plugin.forms.fields.redirect.url.label"),
							description: copy(
								"admin:plugin.forms.fields.redirect.url.description",
							),
							placeholder: "/thank-you",
						},
						localized: true,
						validation: { required: true, zod: redirectSchema },
						ui: { condition: whenConfirmation("redirect") },
					}),
					...(features.captcha
						? [
								field.checkbox(formFields.captcha, {
									details: {
										label: copy("admin:plugin.forms.fields.captcha.label"),
										description: copy(
											"admin:plugin.forms.fields.captcha.description",
										),
									},
									default: true,
									ui: { width: 6 },
								}),
							]
						: []),
					field.checkbox(formFields.honeypot, {
						details: {
							label: copy("admin:plugin.forms.fields.honeypot.label"),
							description: copy(
								"admin:plugin.forms.fields.honeypot.description",
							),
						},
						default: true,
						ui: { width: features.captcha ? 6 : 12 },
					}),
				],
			}),
			field.tab("sending", {
				details: { label: copy("admin:plugin.forms.tabs.emails") },
				fields: [
					field.repeater(formFields.emails, {
						details: {
							label: copy("admin:plugin.forms.fields.emails.label"),
							description: copy("admin:plugin.forms.fields.emails.description"),
						},
						fields: [
							field.text(formFields.emailTo, {
								details: {
									label: copy("admin:plugin.forms.fields.emails.to.label"),
									description: copy(
										"admin:plugin.forms.fields.emails.to.description",
									),
								},
								localized: false,
								validation: { required: true },
								ui: { width: 6 },
							}),
							field.text(formFields.emailReplyTo, {
								details: {
									label: copy(
										"admin:plugin.forms.fields.emails.reply.to.label",
									),
								},
								localized: false,
								ui: { width: 6 },
							}),
							field.text(formFields.emailSubject, {
								details: {
									label: copy("admin:plugin.forms.fields.emails.subject.label"),
								},
								localized: true,
								validation: { required: true },
							}),
							field.textarea(formFields.emailMessage, {
								details: {
									label: copy("admin:plugin.forms.fields.emails.message.label"),
								},
								localized: true,
							}),
						],
					}),
				],
			}),
			//* nothing is stored and nobody is notified without the submissions collection
			...(options.submissions === false
				? []
				: [
						field.tab("submissions", {
							details: { label: copy("admin:plugin.forms.tabs.submissions") },
							fields: [
								field.checkbox(formFields.store, {
									details: {
										label: copy("admin:plugin.forms.fields.store.label"),
										description: copy(
											"admin:plugin.forms.fields.store.description",
										),
									},
									default: true,
									ui: { width: 6 },
								}),
								field.checkbox(formFields.notify, {
									details: {
										label: copy("admin:plugin.forms.fields.notify.label"),
										description: copy(
											"admin:plugin.forms.fields.notify.description",
										),
									},
									default: true,
									ui: { width: 6 },
								}),
								field.number(formFields.retentionDays, {
									details: {
										label: copy(
											"admin:plugin.forms.fields.retention.days.label",
										),
										description: copy(
											"admin:plugin.forms.fields.retention.days.description",
										),
									},
									validation: { zod: z.number().int().positive() },
								}),
							],
						}),
					]),
		],
	});

export default createFormsCollection;
