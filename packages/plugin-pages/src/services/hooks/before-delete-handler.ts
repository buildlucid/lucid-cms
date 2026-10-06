import { copy } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal, RouteScope } from "../../types/types.js";
import { checkFullSlugUniqueness } from "../checks/index.js";
import getTargetCollection from "../get-target-collection.js";
import updateRouteFields from "../update-route-fields.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";
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
		if (segmentUpdatesRes.error) return segmentUpdatesRes;

		// ----------------------------------------------------------------
		// Validation / Setup
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const versionTypes = [
			"latest",
			...(meta.collection.getData.publishing.targets?.map((env) => env.key) ||
				[]),
		];

		for (const versionType of versionTypes) {
			const scope: RouteScope = { type: "version", versionType };
			const docFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: data.ids,
				scope,
				tables: meta.collectionTableNames,
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
			});
			if (docFullSlugsRes.error) return docFullSlugsRes;

			if (docFullSlugsRes.data.length === 0) {
				continue;
			}

			const projectedDocumentIds = docFullSlugsRes.data.map(
				(doc) => doc.documentId,
			);
			const checkFullSlugUniquenessRes = await checkFullSlugUniqueness(
				context,
				{
					collection: targetCollectionRes.data,
					projectedFullSlugs: docFullSlugsRes.data,
					scope,
					tables: meta.collectionTableNames,
					excludeDocumentIds: [...data.ids, ...projectedDocumentIds],
					duplicateMessage: copy(
						"server:plugin.pages.full.slug.duplicate.on.delete",
					),
				},
			);
			if (checkFullSlugUniquenessRes.error) return checkFullSlugUniquenessRes;

			const updateRes = await updateRouteFields(context, {
				toolkit,
				collectionKey: meta.collectionKey,
				field: "fullSlug",
				excludeDocumentIds: data.ids,
				values: docFullSlugsRes.data,
				scope,
				tables: meta.collectionTableNames,
			});
			if (updateRes.error) return updateRes;
		}

		return {
			error: undefined,
			data: undefined,
		};
	};

export default beforeDeleteHandler;
