import T from "../translations/index.js";
import constants from "../constants.js";
import { z } from "@lucidcms/core";
import type { CollectionBuilder } from "@lucidcms/core/builders";
import type { CollectionConfig } from "../types/index.js";

const registerFields = (
	collection: CollectionBuilder,
	config: CollectionConfig,
) => {
	collection
		.addText(constants.fields.fullSlug.key, {
			labels: {
				title: T("full_slug"),
			},
			translations: config.enableTranslations,
			hidden: !config.displayFullSlug,
			disabled: true,
			collection: {
				column: config.displayFullSlug,
				filterable: config.displayFullSlug,
			},
		})
		.addText(constants.fields.slug.key, {
			labels: {
				title: T("slug"),
			},
			translations: config.enableTranslations,
			hidden: false,
			disabled: false,
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
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addDocument(constants.fields.parentPage.key, {
			collection: collection.key,
			labels: {
				title: T("parent_page"),
			},
			hidden: false,
			disabled: false,
		});
};

export default registerFields;
