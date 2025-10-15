import buildFullSlug from "../utils/build-fullslug-from-fullslug.js";
import type {
	Config,
	FieldInputSchema,
	ServiceResponse,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../types/types.js";
import type { ParentPageQueryResponse } from "./get-parent-fields.js";

/**
 *  Constructs the fullSlug from the slug and parentPage fields
 */
const constructParentFullSlug = (data: {
	collection: CollectionConfig;
	parentFields: Array<ParentPageQueryResponse>;
	localization: Config["localization"];
	fields: {
		slug: FieldInputSchema;
	};
}): Awaited<ServiceResponse<Record<string, string | null>>> => {
	// initialise fullSlug with null values for each locale
	const fullSlug: Record<string, string | null> =
		data.localization.locales.reduce<Record<string, string | null>>(
			(acc, locale) => {
				acc[locale.code] = null;
				return acc;
			},
			{},
		);

	// if translations are enabled/set
	if (data.collection.useTranslations && data.fields.slug.translations) {
		for (let i = 0; i < data.localization.locales.length; i++) {
			const locale = data.localization.locales[i];
			if (!locale) continue;

			fullSlug[locale.code] = buildFullSlug({
				parentFields: data.parentFields || [],
				targetLocale: locale.code,
				slug: data.fields.slug.translations[locale.code],
			});
		}
	} else {
		fullSlug[data.localization.defaultLocale] = buildFullSlug({
			parentFields: data.parentFields || [],
			targetLocale: data.localization.defaultLocale,
			slug: data.fields.slug.value,
		});
	}

	return {
		error: undefined,
		data: fullSlug,
	};
};

export default constructParentFullSlug;
