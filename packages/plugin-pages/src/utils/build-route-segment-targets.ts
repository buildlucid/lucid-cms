import type { CollectionBuilder } from "@lucidcms/core";
import type { CFConfig } from "@lucidcms/core/types";
import type {
	CollectionConfig,
	RouteSegmentSelection,
	RouteSegmentTarget,
} from "../types/types.js";

/** Resolves validated segment selections against their configured target fields. */
const buildRouteSegmentTargets = (data: {
	collection: CollectionConfig;
	collectionInstance: CollectionBuilder;
	collections: CollectionBuilder[];
	sourceKeys: string[];
	selections: RouteSegmentSelection[];
}) => {
	const selections = new Map(
		data.selections.map((selection) => [
			`${selection.sourceKey}:${selection.index}`,
			selection,
		]),
	);
	const targets: RouteSegmentTarget[] = [];

	for (const sourceKey of data.sourceKeys) {
		for (const [index, segment] of data.collection.segments.entries()) {
			const selection = selections.get(`${sourceKey}:${index}`);
			const relation = data.collectionInstance.fields.get(segment.relation);
			const relationConfig = relation?.config as CFConfig<"relation">;
			const targetCollectionKey = relationConfig.collection[0];
			const targetCollection = data.collections.find(
				(collection) => collection.key === targetCollectionKey,
			);
			const targetField = targetCollection?.fields.get(segment.field);

			if (
				!targetCollectionKey ||
				!selection ||
				selection.collectionKey !== targetCollectionKey ||
				typeof selection.documentId !== "number" ||
				!targetField
			) {
				return { targets, missingRelation: segment.relation };
			}

			targets.push({
				sourceKey,
				index,
				relation: segment.relation,
				field: segment.field,
				collectionKey: targetCollectionKey,
				documentId: selection.documentId,
				localized: targetField.localizedEnabled,
			});
		}
	}

	return { targets, missingRelation: null };
};

export default buildRouteSegmentTargets;
