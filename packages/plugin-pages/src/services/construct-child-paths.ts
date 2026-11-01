import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";
import type { CollectionConfig, ProjectedPath } from "../types/types.js";
import buildPath from "../utils/build-path-from-slugs.js";
import normalizePathValue from "../utils/normalize-path-value.js";
import resolveCollectionPrefix from "../utils/resolve-collection-prefix.js";
import type { ResolvedPagesCollectionLocalization } from "../utils/resolve-pages-collection-localization.js";
import type { PageVersionFields } from "./get-pages-fields.js";

/** Rebuilds descendant paths, skipping unchanged routes. */
const constructChildPath = (data: {
	descendants: PageVersionFields[];
	localization: ResolvedPagesCollectionLocalization;
	parentPathField?: FieldInputSchema;
	collection: CollectionConfig;
	routePrefixes?: Map<number, Map<string | null, string | null>>;
}): Awaited<ServiceResponse<ProjectedPath[]>> => {
	const documentPaths: ProjectedPath[] = [];

	for (const descendant of data.descendants) {
		const path = new Map<string | null, string | null>();
		const routePrefixes = data.routePrefixes?.get(
			descendant.document_version_id,
		);

		if (data.localization.enabled) {
			if (
				data.parentPathField !== undefined &&
				!data.parentPathField.translations
			) {
				break;
			}

			for (const locale of data.localization.locales) {
				const currentPathValue = data.parentPathField?.translations?.[locale];

				if (data.parentPathField !== undefined && !currentPathValue) {
					continue;
				}

				path.set(
					locale,
					buildPath({
						targetLocale: locale,
						currentDescendant: descendant,
						descendants: data.descendants,
						topLevelPath:
							currentPathValue ??
							routePrefixes?.get(locale) ??
							resolveCollectionPrefix({
								collection: data.collection,
								localeCode: locale,
							}),
					}),
				);
			}
		} else {
			if (data.parentPathField !== undefined && !data.parentPathField.value) {
				break;
			}

			path.set(
				data.localization.defaultLocale,
				buildPath({
					targetLocale: data.localization.defaultLocale,
					currentDescendant: descendant,
					descendants: data.descendants,
					topLevelPath:
						data.parentPathField?.value ??
						routePrefixes?.get(data.localization.defaultLocale) ??
						resolveCollectionPrefix({
							collection: data.collection,
							localeCode: data.localization.defaultLocale,
						}),
				}),
			);
		}

		const unchanged = [...path].every(
			([locale, value]) =>
				normalizePathValue(
					descendant.rows.find((row) => row.locale === locale)?._path,
				) === normalizePathValue(value),
		);
		if (unchanged) continue;

		documentPaths.push({
			documentId: descendant.document_id,
			versionId: descendant.document_version_id,
			values: path,
		});
	}

	return {
		error: undefined,
		data: documentPaths,
	};
};

export default constructChildPath;
