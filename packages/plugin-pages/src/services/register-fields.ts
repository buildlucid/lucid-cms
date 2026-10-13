import { type CollectionBuilder, copy, z } from "@lucidcms/core";
import constants from "../constants.js";
import type { CollectionConfig } from "../types/types.js";
import registerFieldsAtPlacement from "./register-fields-at-placement.js";

const slugSlashMessage = 'Only use a slash when the slug is exactly "/".';
const slugSpaceMessage = "The slug cannot contain spaces.";
const slugFormatMessage =
	"The slug may only contain letters, numbers, underscores, and hyphens.";

/** Adds the fullSlug, slug, parent page and route segment fields to a pages collection. */
const registerFields = (
	collection: CollectionBuilder,
	config: CollectionConfig,
) => {
	const fieldKeys = [
		constants.fields.fullSlug.key,
		constants.fields.slug.key,
		constants.fields.parentPage.key,
		...config.segments.map((segment) => segment.relation),
	];

	registerFieldsAtPlacement({
		collection,
		fieldKeys,
		placement: config.ui.placement,
		register: () => {
			collection
				.addText(constants.fields.fullSlug.key, {
					details: {
						label: copy("admin:plugin.pages.fields.full.slug.label", {
							defaultMessage: "Full slug",
						}),
					},
					localized: config.localized,
					ui: {
						hidden: true,
						disabled: true,
					},
					ai: {
						instructions:
							"Generated from the slug and parent pages. Read it for a page's full path, but set the slug and parent page to change it.",
					},
					showInList: false,
				})
				.addText(constants.fields.slug.key, {
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
				})
				.addRelation(constants.fields.parentPage.key, {
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
				});

			for (const segment of config.segments) {
				collection.addRelation(segment.relation, {
					collection: segment.collection,
					multiple: false,
					ui: {
						width: config.ui.widths.segments,
					},
					validation: {
						required: true,
					},
				});
			}
		},
	});
};

export default registerFields;
