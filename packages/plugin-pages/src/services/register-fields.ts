import { copy, field, z } from "@lucidcms/core";
import type { CollectionDefinition } from "@lucidcms/core/types";
import constants from "../constants.js";
import type { CollectionConfig } from "../types/types.js";

const slugSlashMessage = 'Only use a slash when the slug is exactly "/".';
const slugSpaceMessage = "The slug cannot contain spaces.";
const slugFormatMessage =
	"The slug may only contain letters, numbers, underscores, and hyphens.";

/** Adds the path, slug, parent page and route segment fields to a pages collection. */
const registerFields = (
	collection: CollectionDefinition,
	config: CollectionConfig,
) => {
	collection.insertFields(
		[
			field.text(constants.fields.path.key, {
				details: {
					label: copy("admin:plugin.pages.fields.path.label", {
						defaultMessage: "Path",
					}),
				},
				localized: config.localized,
				ui: {
					hidden: true,
					disabled: true,
				},
				ai: {
					instructions:
						"Generated from the slug and parent pages. Read it for a page's path, but set the slug and parent page to change it.",
				},
				showInList: false,
			}),
			field.text(constants.fields.slug.key, {
				details: {
					label: copy("admin:plugin.pages.fields.slug.label", {
						defaultMessage: "Slug",
					}),
				},
				localized: config.localized,
				ui: {
					hidden: false,
					disabled: false,
					width: config.ui.widths.slug,
				},
				ai: {
					instructions:
						'This page\'s own URL segment; parent pages supply the rest of the path. Use a few lowercase words joined by hyphens that clearly describe the page, such as "pricing" or "careers-london". Prefer the words people search for, and leave out filler words and dates that will age. Only a homepage without a parent page uses "/". Any other slug must not contain "/". Avoid changing an existing slug unless asked, as it changes the page\'s URL.',
				},
				validation: {
					required: true,
					zod: z.string().superRefine((value, ctx) => {
						if (value === "/") return;
						if (value.includes("/")) {
							ctx.addIssue({
								code: "custom",
								message: slugSlashMessage,
							});
							return;
						}
						if (/\s/.test(value)) {
							ctx.addIssue({
								code: "custom",
								message: slugSpaceMessage,
							});
							return;
						}
						if (/^[a-zA-Z0-9_-]+$/.test(value)) return;

						ctx.addIssue({
							code: "custom",
							message: slugFormatMessage,
						});
					}),
				},
				useAsLabel: true,
				showInList: true,
			}),
			field.relation(constants.fields.parentPage.key, {
				collection: collection.key,
				details: {
					label: copy("admin:plugin.pages.fields.parent.page.label", {
						defaultMessage: "Parent page",
					}),
				},
				multiple: false,
				ui: {
					hidden: false,
					disabled: false,
					width: config.ui.widths.parentPage,
				},
				showInList: true,
			}),
			...config.segments.map((segment) =>
				field.relation(segment.relation, {
					collection: segment.collection,
					multiple: false,
					ui: {
						width: config.ui.widths.segments,
					},
					validation: {
						required: true,
					},
				}),
			),
		],
		config.ui.placement,
	);
};

export default registerFields;
