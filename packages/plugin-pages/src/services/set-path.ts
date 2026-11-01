import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";
import type { ResolvedPagesCollectionLocalization } from "../utils/resolve-pages-collection-localization.js";

const setPath = (data: {
	path: Map<string | null, string | null>;
	localization: ResolvedPagesCollectionLocalization;
	fields: {
		path: FieldInputSchema;
	};
}): Awaited<ServiceResponse<undefined>> => {
	if (data.localization.enabled) {
		data.fields.path.translations = Object.fromEntries(
			[...data.path].filter(([locale]) => locale !== null),
		);
	} else {
		data.fields.path.value = data.path.get(data.localization.storageLocale);
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default setPath;
