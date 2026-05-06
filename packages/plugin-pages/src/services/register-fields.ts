import type { CollectionBuilder } from "@lucidcms/core";
import { z } from "@lucidcms/core";
import type { WritableDraft } from "immer";
import constants from "../constants.js";
import T from "../translations/index.js";
import type { CollectionConfig } from "../types/types.js";

const registerFields = (
	collection: WritableDraft<CollectionBuilder>,
	config: CollectionConfig,
) => {
	collection
		.addText(constants.fields.fullSlug.key, {
			details: {
				label: T("full_slug"),
			},
			config: {
				translations: config.translations,
				hidden: !config.displayFullSlug,
				disabled: true,
			},
			displayInListing: config.displayFullSlug,
		})
		.addText(constants.fields.slug.key, {
			details: {
				label: T("slug"),
			},
			config: {
				translations: config.translations,
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
							T("slug_field_validation_error_message"),
						),
				]),
			},
			displayInListing: true,
		})
		.addDocument(constants.fields.parentPage.key, {
			collection: collection.key,
			details: {
				label: T("parent_page"),
			},
			config: {
				hidden: false,
				disabled: false,
				multiple: false,
			},
		});
};

export default registerFields;
