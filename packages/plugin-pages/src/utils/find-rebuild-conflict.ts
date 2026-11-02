import type { PageVersionFields } from "../services/get-pages-fields.js";
import type { ProjectedPath, RouteUniquenessItem } from "../types/types.js";
import type { ResolvedPagesCollectionLocalization } from "./resolve-pages-collection-localization.js";
import {
	buildRouteUniquenessItems,
	findExistingRouteCollisions,
	findProjectedRouteDuplicates,
} from "./route-uniqueness.js";

/**
 * Finds the first conflict involving a rebuilt path. Ignores existing conflicts between unchanged
 * paths.
 */
const findRebuildConflict = (data: {
	versions: PageVersionFields[];
	changed: ProjectedPath[];
	localization: ResolvedPagesCollectionLocalization;
}): RouteUniquenessItem | undefined => {
	const changedVersionIds = new Set(data.changed.map((path) => path.versionId));
	const changedItems = buildRouteUniquenessItems({
		projectedPaths: data.changed,
	});
	const keptItems = buildRouteUniquenessItems({
		projectedPaths: data.versions
			.filter((version) => !changedVersionIds.has(version.document_version_id))
			.map((version) => ({
				documentId: version.document_id,
				versionId: version.document_version_id,
				values: new Map(
					data.localization.locales.map((locale) => [
						locale,
						version.rows.find((row) => row.locale === locale)?._path ?? null,
					]),
				),
			})),
	});

	return (
		findProjectedRouteDuplicates(changedItems)[0] ??
		findExistingRouteCollisions({
			projectedItems: changedItems,
			existingItems: keptItems,
		})[0]
	);
};

export default findRebuildConflict;
