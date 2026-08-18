import { CollectionBuilder, copy, z } from "@lucidcms/core";
import {
	COLLECTION_KEY,
	fields,
	statusCodes,
	targetTypes,
} from "../constants.js";
import type { RedirectsPluginOptionsInternal } from "../types.js";

const sourcePathSchema = z
	.string()
	.trim()
	.min(1, "Enter the old website path.")
	.refine((value) => value.startsWith("/"), {
		message: "The old website path must begin with a slash.",
	});

const targetUrlSchema = z
	.string()
	.trim()
	.min(1, "Enter where visitors should be sent.")
	.superRefine((value, context) => {
		if (value.startsWith("/")) return;

		try {
			const parsed = new URL(value);
			if (parsed.protocol === "http:" || parsed.protocol === "https:") return;
		} catch {
			// The issue below provides the field-facing validation message.
		}

		context.addIssue({
			code: "custom",
			message:
				"Enter an address on this website beginning with a slash, or a full address beginning with http:// or https://.",
		});
	});

const statusCodeLabels: Record<(typeof statusCodes)[number], string> = {
	"301": "Permanent (301) — recommended",
	"302": "Temporary (302)",
	"307": "Temporary, keep request method (307)",
	"308": "Permanent, keep request method (308)",
};

/** Creates the collection managed by the redirects plugin. */
const createRedirectsCollection = (options: RedirectsPluginOptionsInternal) => {
	const collection = new CollectionBuilder(COLLECTION_KEY, {
		mode: "multiple",
		group: options.navigationGroup ?? COLLECTION_KEY,
		details: {
			name: copy("admin:plugin.redirects.collection.name", {
				defaultMessage: "Redirects",
			}),
			singularName: copy("admin:plugin.redirects.collection.singular.name", {
				defaultMessage: "Redirect",
			}),
			summary: copy("admin:plugin.redirects.collection.summary", {
				defaultMessage:
					"Send visitors from an old or incorrect web address to the right content or another website.",
			}),
		},
		localized: false,
		revisions: true,
		autoSave: false,
		scheduling: false,
		orderable: false,
		environments: options.environments,
	});

	if (options.locales.length > 1) {
		collection.addSelect(fields.locale, {
			details: {
				label: copy("admin:plugin.redirects.fields.locale.label", {
					defaultMessage: "Language",
				}),
			},
			options: options.locales.map((locale) => ({
				label: locale.label,
				value: locale.code,
			})),
			default: options.defaultLocale,
			index: true,
			validation: { required: true },
			ui: { width: 6 },
			showInList: true,
		});
	}

	collection.addText(fields.from, {
		details: {
			label: copy("admin:plugin.redirects.fields.from.label", {
				defaultMessage: "Redirect from",
			}),
			summary: copy("admin:plugin.redirects.fields.from.summary", {
				defaultMessage:
					"Enter the old path, starting with a slash. For example, /old-page.",
			}),
			placeholder: "/old-page",
		},
		localized: false,
		index: true,
		ai: { enabled: false },
		validation: {
			required: true,
			zod: sourcePathSchema,
		},
		ui: { width: 12 },
		useAsLabel: true,
		showInList: true,
	});

	collection
		.addSelect(fields.targetType, {
			details: {
				label: copy("admin:plugin.redirects.fields.target.type.label", {
					defaultMessage: "Redirect to",
				}),
			},
			options: [
				{
					label: copy("admin:plugin.redirects.target.type.document", {
						defaultMessage: "Existing content",
					}),
					value: targetTypes.document,
				},
				{
					label: copy("admin:plugin.redirects.target.type.url", {
						defaultMessage: "A web address",
					}),
					value: targetTypes.url,
				},
			],
			default: targetTypes.document,
			index: true,
			validation: { required: true },
			ui: { width: 6 },
			showInList: true,
		})
		.addSelect(fields.statusCode, {
			details: {
				label: copy("admin:plugin.redirects.fields.status.code.label", {
					defaultMessage: "Redirect type",
				}),
				summary: copy("admin:plugin.redirects.fields.status.code.summary", {
					defaultMessage:
						"Use Permanent (301) for most redirects. Use a temporary redirect if the old page will return.",
				}),
			},
			options: statusCodes.map((statusCode) => ({
				label: copy(`admin:plugin.redirects.status.code.${statusCode}`, {
					defaultMessage: statusCodeLabels[statusCode],
				}),
				value: statusCode,
			})),
			default: "301",
			index: true,
			validation: { required: true },
			ui: { width: 6 },
			showInList: true,
		})
		.addRelation(fields.targetDocument, {
			collection: options.collections,
			details: {
				label: copy("admin:plugin.redirects.fields.target.document.label", {
					defaultMessage: "Destination content",
				}),
				summary: copy("admin:plugin.redirects.fields.target.document.summary", {
					defaultMessage:
						"The redirect follows this content if its web address changes.",
				}),
			},
			localized: false,
			multiple: false,
			validation: { required: true },
			ui: {
				width: 12,
				condition: {
					groups: [
						[
							{
								field: fields.targetType,
								operator: "equals",
								value: targetTypes.document,
							},
						],
					],
				},
			},
			showInList: true,
		})
		.addText(fields.targetUrl, {
			details: {
				label: copy("admin:plugin.redirects.fields.target.url.label", {
					defaultMessage: "Destination web address",
				}),
				summary: copy("admin:plugin.redirects.fields.target.url.summary", {
					defaultMessage:
						"Enter a path on this website, such as /new-page, or a full web address, such as https://example.com.",
				}),
				placeholder: "/new-page",
			},
			localized: false,
			ai: { enabled: false },
			validation: {
				required: true,
				zod: targetUrlSchema,
			},
			ui: {
				width: 12,
				condition: {
					groups: [
						[
							{
								field: fields.targetType,
								operator: "equals",
								value: targetTypes.url,
							},
						],
					],
				},
			},
			showInList: true,
		});

	return collection;
};

export { sourcePathSchema, targetUrlSchema };
export default createRedirectsCollection;
