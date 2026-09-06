import { copy } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import { checkFullSlugUniqueness } from "../checks/index.js";
import { getTargetCollection, updateFullSlugFields } from "../index.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";
import propagateRouteSegmentUpdates from "./helpers/propagate-route-segment-updates.js";

/**
 * Removes deleted parent pages and route segments from affected page paths.
 */
const beforeDeleteHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"beforeDelete">["handler"] =>
	async (context, data) => {
		const segmentUpdatesRes = await propagateRouteSegmentUpdates(context, {
			options,
			targetCollectionKey: data.meta.collectionKey,
			deletedDocumentIds: data.data.ids,
		});
		if (segmentUpdatesRes.error) return segmentUpdatesRes;

		// ----------------------------------------------------------------
		// Validation / Setup
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: data.meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			//* early return as doesnt apply to the current collection
			return {
				error: undefined,
				data: undefined,
			};
		}

		// Process both latest and all configured environments
		const versionTypes = [
			"latest",
			...(data.meta.collection.getData.publishing.targets?.map(
				(env) => env.key,
			) || []),
		];

		for (const versionType of versionTypes) {
			const docFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: data.data.ids,
				versionType,
				collectionKey: targetCollectionRes.data.key,
				tables: data.meta.collectionTableNames,
				collection: targetCollectionRes.data,
				collectionInstance: data.meta.collection,
			});
			if (docFullSlugsRes.error) return docFullSlugsRes;

			// Skip to next version type if no descendants found
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
					versionType,
					collectionKey: targetCollectionRes.data.key,
					tables: data.meta.collectionTableNames,
					excludeDocumentIds: [...data.data.ids, ...projectedDocumentIds],
					duplicateMessage: copy(
						"server:plugin.pages.full.slug.duplicate.on.delete",
					),
				},
			);
			if (checkFullSlugUniquenessRes.error) return checkFullSlugUniquenessRes;

			const updateFullSlugFieldsRes = await updateFullSlugFields(context, {
				collectionKey: data.meta.collectionKey,
				docFullSlugs: docFullSlugsRes.data,
				versionType,
				tables: data.meta.collectionTableNames,
			});
			if (updateFullSlugFieldsRes.error) return updateFullSlugFieldsRes;
		}

		return {
			error: undefined,
			data: undefined,
		};
	};

export default beforeDeleteHandler;
