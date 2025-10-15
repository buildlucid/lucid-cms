import type { CollectionConfig } from "../types/types.js";
import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";

/**
 *  Update the fullSlug field with the computed value
 */
const setFullSlug = (data: {
	fullSlug: Record<string, string | null>;
	collection: CollectionConfig;
	defaultLocale: string;
	fields: {
		fullSlug: FieldInputSchema;
	};
}): Awaited<ServiceResponse<undefined>> => {
	if (data.collection.useTranslations) {
		data.fields.fullSlug.translations = data.fullSlug;
	} else {
		data.fields.fullSlug.value = data.fullSlug[data.defaultLocale];
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default setFullSlug;
