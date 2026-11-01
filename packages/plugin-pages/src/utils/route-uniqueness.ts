import type { ProjectedPath, RouteUniquenessItem } from "../types/types.js";
import normalizePathValue from "./normalize-path-value.js";

const routeKey = (item: RouteUniquenessItem) => {
	return `${item.locale}::${item.path}`;
};

/** Flattens projected paths into one normalised route per document version and locale. */
export const buildRouteUniquenessItems = (data: {
	projectedPaths: ProjectedPath[];
}): RouteUniquenessItem[] => {
	const items: RouteUniquenessItem[] = [];

	for (const projected of data.projectedPaths) {
		for (const [locale, path] of projected.values) {
			const normalizedPath = normalizePathValue(path);
			if (typeof normalizedPath !== "string") continue;

			items.push({
				documentId: projected.documentId,
				versionId: projected.versionId,
				locale,
				path: normalizedPath,
			});
		}
	}

	return items;
};

/** Finds duplicate routes within the set we are about to write. */
export const findProjectedRouteDuplicates = (
	items: RouteUniquenessItem[],
): RouteUniquenessItem[] => {
	const seen = new Map<string, RouteUniquenessItem>();
	const conflicts: RouteUniquenessItem[] = [];

	for (const item of items) {
		const key = routeKey(item);
		if (seen.has(key)) {
			conflicts.push(item);
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
}): RouteUniquenessItem[] => {
	const projectedByKey = new Map<string, RouteUniquenessItem>();
	for (const item of data.projectedItems) {
		projectedByKey.set(routeKey(item), item);
	}

	const conflicts: RouteUniquenessItem[] = [];
	for (const item of data.existingItems) {
		const projected = projectedByKey.get(routeKey(item));
		if (!projected) continue;

		conflicts.push(projected);
	}

	return conflicts;
};
