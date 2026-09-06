import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";
import type { ResolvedPagesCollectionLocalization } from "../utils/resolve-pages-collection-localization.js";

/**
 *  Update the fullSlug field with the computed value
 */
const setFullSlug = (data: {
	fullSlug: Map<string | null, string | null>;
	localization: ResolvedPagesCollectionLocalization;
	fields: {
		fullSlug: FieldInputSchema;
	};
}): Awaited<ServiceResponse<undefined>> => {
	if (data.localization.enabled) {
		data.fields.fullSlug.translations = Object.fromEntries(
			[...data.fullSlug].filter(([locale]) => locale !== null),
		);
	} else {
		data.fields.fullSlug.value = data.fullSlug.get(
			data.localization.storageLocale,
		);
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default setFullSlug;
