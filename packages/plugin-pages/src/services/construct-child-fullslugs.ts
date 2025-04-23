import buildFullSlug from "../utils/build-fullslug-from-slugs.js";
import type {
	Config,
	FieldInputSchema,
	ServiceResponse,
} from "@lucidcms/core/types";
import type { DescendantFieldsResponse } from "../services/get-descendant-fields.js";
import type { CollectionConfig } from "../types/index.js";

/**
 *  Constructs the fullSlug for the child documents
 */
const constructChildFullSlug = (data: {
	descendants: DescendantFieldsResponse[];
	localisation: Config["localisation"];
	parentFullSlugField?: FieldInputSchema;
	collection: CollectionConfig;
}): Awaited<
	ServiceResponse<
		Array<{
			documentId: number;
			versionId: number;
			fullSlugs: Record<string, string | null>;
		}>
	>
> => {
	const documentFullSlugs: Array<{
		documentId: number;
		versionId: number;
		fullSlugs: Record<string, string | null>;
	}> = [];

	for (const descendant of data.descendants) {
		const fullSlug: Record<string, string | null> = {};

		if (data.collection.useTranslations) {
			if (
				data.parentFullSlugField !== undefined &&
				!data.parentFullSlugField.translations
			)
				break;

			for (const locale of data.localisation.locales) {
				const currentFullSlugValue =
					data.parentFullSlugField?.translations?.[locale.code];

				if (data.parentFullSlugField !== undefined && !currentFullSlugValue) {
					continue;
				}

				fullSlug[locale.code] = buildFullSlug({
					targetLocale: locale.code,
					currentDescendant: descendant,
					descendants: data.descendants,
					topLevelFullSlug: currentFullSlugValue,
				});
			}
		} else {
			if (
				data.parentFullSlugField !== undefined &&
				!data.parentFullSlugField.value
			)
				break;

			fullSlug[data.localisation.defaultLocale] = buildFullSlug({
				targetLocale: data.localisation.defaultLocale,
				currentDescendant: descendant,
				descendants: data.descendants,
				topLevelFullSlug: data.parentFullSlugField?.value,
			});
		}

		documentFullSlugs.push({
			documentId: descendant.document_id,
			versionId: descendant.document_version_id,
			fullSlugs: fullSlug,
		});
	}

	return {
		error: undefined,
		data: documentFullSlugs,
	};
};

export default constructChildFullSlug;
