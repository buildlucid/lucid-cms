import { adminText, type CollectionBuilder, z } from "@lucidcms/core";
import { serverText } from "@lucidcms/core/plugin";
import type { WritableDraft } from "immer";
import constants from "../constants.js";
import type { CollectionConfig } from "../types/types.js";

const registerFields = (
	collection: WritableDraft<CollectionBuilder>,
	config: CollectionConfig,
) => {
	collection
		.addText(constants.fields.fullSlug.key, {
			details: {
				label: adminText("plugin.pages.fields.full.slug.label", {
					fallback: "Full slug",
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
				label: adminText("plugin.pages.fields.slug.label", {
					fallback: "Slug",
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
					z
						.string()
						.regex(
							/^[a-zA-Z0-9_-]+$/,
							serverText("plugin.pages.slug.validation.format").default,
						),
				]),
			},
			displayInListing: true,
		})
		.addDocument(constants.fields.parentPage.key, {
			collection: collection.key,
			details: {
				label: adminText("plugin.pages.fields.parent.page.label", {
					fallback: "Parent page",
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
