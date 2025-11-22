import T from "../translations/index.js";
import constants from "../constants.js";
import { z } from "@lucidcms/core";
import type { CollectionBuilder } from "@lucidcms/core/builders";
import type { CollectionConfig } from "../types/types.js";
import type { WritableDraft } from "immer";

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
				useTranslations: config.useTranslations,
				isHidden: !config.displayFullSlug,
				isDisabled: true,
			},
			displayInListing: config.displayFullSlug,
		})
		.addText(constants.fields.slug.key, {
			details: {
				label: T("slug"),
			},
			config: {
				useTranslations: config.useTranslations,
				isHidden: false,
				isDisabled: false,
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
				isHidden: false,
				isDisabled: false,
			},
		});
};

export default registerFields;
