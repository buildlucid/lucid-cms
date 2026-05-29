import { type CollectionBuilder, text, z, zodTextIssue } from "@lucidcms/core";
import type { WritableDraft } from "immer";
import constants from "../constants.js";
import type { CollectionConfig } from "../types/types.js";

const slugFormatMessage = text.server("plugin.pages.slug.validation.format", {
	defaultMessage:
		"The slug field may only contain letters, numbers, underscores, and hyphens.",
});

const registerFields = (
	collection: WritableDraft<CollectionBuilder>,
	config: CollectionConfig,
) => {
	collection
		.addText(constants.fields.fullSlug.key, {
			details: {
				label: text.admin("plugin.pages.fields.full.slug.label", {
					defaultMessage: "Full slug",
				}),
			},
			config: {
				localized: config.localized,
				hidden: !config.displayFullSlug,
				disabled: true,
			},
			displayInListing: config.displayFullSlug,
		})
		.addText(constants.fields.slug.key, {
			details: {
				label: text.admin("plugin.pages.fields.slug.label", {
					defaultMessage: "Slug",
				}),
			},
			config: {
				localized: config.localized,
				hidden: false,
				disabled: false,
			},
			validation: {
				required: true,
				zod: z.union([
					z.literal("/"),
					z.string().superRefine((value, ctx) => {
						if (/^[a-zA-Z0-9_-]+$/.test(value)) return;
						ctx.addIssue({
							code: "custom",
							...zodTextIssue(slugFormatMessage),
						});
					}),
				]),
			},
			displayInListing: true,
		})
		.addDocument(constants.fields.parentPage.key, {
			collection: collection.key,
			details: {
				label: text.admin("plugin.pages.fields.parent.page.label", {
					defaultMessage: "Parent page",
				}),
			},
			config: {
				hidden: false,
				disabled: false,
				multiple: false,
			},
		});
};

export default registerFields;
