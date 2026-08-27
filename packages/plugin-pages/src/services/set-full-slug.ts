import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";
import type { ResolvedPagesCollectionLocalization } from "../utils/resolve-pages-collection-localization.js";

/**
 *  Update the fullSlug field with the computed value
 */
const setFullSlug = (data: {
	fullSlug: Record<string, string | null>;
	localization: ResolvedPagesCollectionLocalization;
	fields: {
		fullSlug: FieldInputSchema;
	};
}): Awaited<ServiceResponse<undefined>> => {
	if (data.localization.enabled) {
		data.fields.fullSlug.translations = data.fullSlug;
	} else {
		data.fields.fullSlug.value = data.fullSlug[data.localization.storageLocale];
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default setFullSlug;
