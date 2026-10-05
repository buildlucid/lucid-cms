import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import getTargetCollection from "../get-target-collection.js";
import propagateRouteSegmentUpdates from "./helpers/propagate-route-segment-updates.js";
import refreshVersionRoute from "./helpers/refresh-version-route.js";

/**
 * Rebuilds the promoted version's route from its parent in the destination,
 * then its descendants there. Release publications are left to the published
 * hook, which handles every released page together. Promoting a
 * route-segment document rebuilds the pages that use it.
 */
const versionPromoteHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"versionPromote">["handler"] =>
	async ({ context, toolkit, data, meta }) => {
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (!targetCollectionRes.error && !meta.release) {
			const refreshRes = await refreshVersionRoute(context, {
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
				tables: meta.collectionTableNames,
				toolkit,
				scope: { type: "version", versionType: data.versionType },
				documentId: data.documentId,
				versionId: data.versionId,
			});
			if (refreshRes.error) return refreshRes;
		}

		return propagateRouteSegmentUpdates(context, {
			toolkit,
			options,
			targetCollectionKey: meta.collectionKey,
			targetDocumentId: data.documentId,
			targetVersionType: data.versionType,
		});
	};

export default versionPromoteHandler;
