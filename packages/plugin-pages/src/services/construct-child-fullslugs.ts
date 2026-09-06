import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";
import type { DescendantFieldsResponse } from "../services/get-descendant-fields.js";
import type { CollectionConfig } from "../types/types.js";
import buildFullSlug from "../utils/build-fullslug-from-slugs.js";
import resolveCollectionPrefix from "../utils/resolve-collection-prefix.js";
import type { ResolvedPagesCollectionLocalization } from "../utils/resolve-pages-collection-localization.js";

/**
 *  Constructs the fullSlug for the child documents
 */
const constructChildFullSlug = (data: {
	descendants: DescendantFieldsResponse[];
	localization: ResolvedPagesCollectionLocalization;
	parentFullSlugField?: FieldInputSchema;
	collection: CollectionConfig;
	routePrefixes?: Map<number, Map<string | null, string | null>>;
}): Awaited<
	ServiceResponse<
		Array<{
			documentId: number;
			versionId: number;
			fullSlugs: Map<string | null, string | null>;
		}>
	>
> => {
	const documentFullSlugs: Array<{
		documentId: number;
		versionId: number;
		fullSlugs: Map<string | null, string | null>;
	}> = [];

	for (const descendant of data.descendants) {
		const fullSlug = new Map<string | null, string | null>();
		const routePrefixes = data.routePrefixes?.get(
			descendant.document_version_id,
		);

		if (data.localization.enabled) {
			if (
				data.parentFullSlugField !== undefined &&
				!data.parentFullSlugField.translations
			)
				break;

			for (const locale of data.localization.locales) {
				const currentFullSlugValue =
					data.parentFullSlugField?.translations?.[locale];

				if (data.parentFullSlugField !== undefined && !currentFullSlugValue) {
					continue;
				}

				fullSlug.set(
					locale,
					buildFullSlug({
						targetLocale: locale,
						currentDescendant: descendant,
						descendants: data.descendants,
						topLevelFullSlug:
							currentFullSlugValue ??
							routePrefixes?.get(locale) ??
							resolveCollectionPrefix({
								collection: data.collection,
								localeCode: locale,
							}),
					}),
				);
			}
		} else {
			if (
				data.parentFullSlugField !== undefined &&
				!data.parentFullSlugField.value
			)
				break;

			fullSlug.set(
				data.localization.defaultLocale,
				buildFullSlug({
					targetLocale: data.localization.defaultLocale,
					currentDescendant: descendant,
					descendants: data.descendants,
					topLevelFullSlug:
						data.parentFullSlugField?.value ??
						routePrefixes?.get(data.localization.defaultLocale) ??
						resolveCollectionPrefix({
							collection: data.collection,
							localeCode: data.localization.defaultLocale,
						}),
				}),
			);
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
