import { copy, LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal, RouteScope } from "../../types/types.js";
import getRouteVersionTypes from "../../utils/get-route-version-types.js";
import { checkPathUniqueness } from "../checks/index.js";
import getTargetCollection from "../get-target-collection.js";
import updateRouteFields from "../update-route-fields.js";
import buildDescendantPaths from "./helpers/build-descendant-paths.js";
import propagateRouteSegmentUpdates from "./helpers/propagate-route-segment-updates.js";

/**
 * Removes deleted parent pages and route segments from affected page paths in
 * latest and every environment. Request versions keep their routes until the
 * request recomputes them.
 */
const beforeDeleteHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"beforeDelete">["handler"] =>
	async ({ context, toolkit, data, meta }) => {
		const segmentUpdatesRes = await propagateRouteSegmentUpdates(context, {
			toolkit,
			options,
			targetCollectionKey: meta.collectionKey,
			deletedDocumentIds: data.ids,
		});
		if (segmentUpdatesRes.error) throw new LucidError(segmentUpdatesRes.error);

		// ----------------------------------------------------------------
		// Validation / Setup
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			return;
		}

		for (const versionType of getRouteVersionTypes(meta.collection)) {
			const scope: RouteScope = { type: "version", versionType };
			const docPathsRes = await buildDescendantPaths(context, {
				documentIds: data.ids,
				scope,
				tables: meta.collectionTableNames,
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
			});
			if (docPathsRes.error) throw new LucidError(docPathsRes.error);

			if (docPathsRes.data.length === 0) {
				continue;
			}

			const projectedDocumentIds = docPathsRes.data.map(
				(doc) => doc.documentId,
			);
			const checkPathUniquenessRes = await checkPathUniqueness(context, {
				collection: targetCollectionRes.data,
				projectedPaths: docPathsRes.data,
				scope,
				tables: meta.collectionTableNames,
				excludeDocumentIds: [...data.ids, ...projectedDocumentIds],
				duplicateMessage: copy("server:plugin.pages.path.duplicate.on.delete"),
			});
			if (checkPathUniquenessRes.error)
				throw new LucidError(checkPathUniquenessRes.error);

			const updateRes = await updateRouteFields(context, {
				toolkit,
				collection: targetCollectionRes.data,
				field: "path",
				excludeDocumentIds: data.ids,
				values: docPathsRes.data,
				scope,
				tables: meta.collectionTableNames,
			});
			if (updateRes.error) throw new LucidError(updateRes.error);
		}

		return;
	};

export default beforeDeleteHandler;
