import { LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import getTargetCollection from "../get-target-collection.js";
import propagateRouteSegmentUpdates from "./helpers/propagate-route-segment-updates.js";
import refreshVersionRoute from "./helpers/refresh-version-route.js";

/**
 * Rebuilds the promoted version's route from its parent in the destination,
 * then its descendants there. Request publications are left to the completed
 * hook, which handles every completed page together. Promoting a
 * route-segment document rebuilds the pages that use it.
 */
const versionPromoteHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"afterVersionPromote">["handler"] =>
	async ({ context, toolkit, data, meta }) => {
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (!targetCollectionRes.error && !meta.request) {
			const refreshRes = await refreshVersionRoute(context, {
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
				tables: meta.collectionTableNames,
				toolkit,
				scope: { type: "version", versionType: data.versionType },
				documentId: data.documentId,
				versionId: data.versionId,
			});
			if (refreshRes.error) throw new LucidError(refreshRes.error);
		}

		const result = await propagateRouteSegmentUpdates(context, {
			toolkit,
			options,
			targetCollectionKey: meta.collectionKey,
			targetDocumentId: data.documentId,
			targetVersionType: data.versionType,
		});
		if (result.error) throw new LucidError(result.error);
		return;
	};

export default versionPromoteHandler;
