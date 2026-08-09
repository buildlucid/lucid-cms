import type {
	ProjectedFullSlug,
	RouteUniquenessConflict,
	RouteUniquenessItem,
} from "../types/types.js";
import normalizePathValue from "./normalize-path-value.js";

const routeKey = (item: RouteUniquenessItem) => {
	return `${item.locale}::${item.fullSlug}`;
};

/** Flattens projected per-locale fullSlugs into comparable route items. */
export const buildRouteUniquenessItems = (data: {
	projectedFullSlugs: ProjectedFullSlug[];
}): RouteUniquenessItem[] => {
	const items: RouteUniquenessItem[] = [];

	for (const projected of data.projectedFullSlugs) {
		for (const [locale, fullSlug] of Object.entries(projected.fullSlugs)) {
			const normalizedFullSlug = normalizePathValue(fullSlug);
			if (typeof normalizedFullSlug !== "string") continue;

			items.push({
				documentId: projected.documentId,
				versionId: projected.versionId,
				locale,
				fullSlug: normalizedFullSlug,
			});
		}
	}

	return items;
};

/** Finds duplicate routes within the set we are about to write. */
export const findProjectedRouteDuplicates = (
	items: RouteUniquenessItem[],
): RouteUniquenessConflict[] => {
	const seen = new Map<string, RouteUniquenessItem>();
	const conflicts: RouteUniquenessConflict[] = [];

	for (const item of items) {
		const key = routeKey(item);
		if (seen.has(key)) {
			conflicts.push({
				locale: item.locale,
				fullSlug: item.fullSlug,
			});
			continue;
		}

		seen.set(key, item);
	}

	return conflicts;
};

/** Finds projected routes that already exist in stored route items. */
export const findExistingRouteCollisions = (data: {
	projectedItems: RouteUniquenessItem[];
	existingItems: RouteUniquenessItem[];
}): RouteUniquenessConflict[] => {
	const projectedByKey = new Map<string, RouteUniquenessItem>();
	for (const item of data.projectedItems) {
		projectedByKey.set(routeKey(item), item);
	}

	const conflicts: RouteUniquenessConflict[] = [];
	for (const item of data.existingItems) {
		const projected = projectedByKey.get(routeKey(item));
		if (!projected) continue;

		conflicts.push({
			locale: projected.locale,
			fullSlug: projected.fullSlug,
		});
	}

	return conflicts;
};
