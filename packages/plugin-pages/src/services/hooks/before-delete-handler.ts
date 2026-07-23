import { copy } from "@lucidcms/core/plugin";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import { checkFullSlugUniqueness } from "../checks/index.js";
import {
	constructChildFullSlug,
	getDescendantFields,
	getTargetCollection,
	updateFullSlugFields,
} from "../index.js";

/**
 * Handles the before delete hook for documents. What this does is:
 * - Updates all of the descendants of the deleted document fullSlug fields so that they dont include the deleted document's slug
 */
const beforeDeleteHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"beforeDelete">["handler"] =>
	async (context, data) => {
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
			...(data.meta.collection.getData.environments?.map((env) => env.key) ||
				[]),
		];

		for (const versionType of versionTypes) {
			const descendantsRes = await getDescendantFields(context, {
				ids: data.data.ids,
				versionType,
				collectionKey: targetCollectionRes.data.collection,
				tables: data.meta.collectionTableNames,
			});
			if (descendantsRes.error) return descendantsRes;

			// Skip to next version type if no descendants found
			if (descendantsRes.data.length === 0) {
				continue;
			}

			const docFullSlugsRes = constructChildFullSlug({
				descendants: descendantsRes.data,
				localization: context.config.localization,
				collection: targetCollectionRes.data,
			});
			if (docFullSlugsRes.error) return docFullSlugsRes;

			const projectedDocumentIds = docFullSlugsRes.data.map(
				(doc) => doc.documentId,
			);
			const checkFullSlugUniquenessRes = await checkFullSlugUniqueness(
				context,
				{
					collection: targetCollectionRes.data,
					collectionInstance: data.meta.collection,
					projectedFullSlugs: docFullSlugsRes.data,
					versionType,
					collectionKey: targetCollectionRes.data.collection,
					tenantKey: data.meta.tenantKey,
					tables: data.meta.collectionTableNames,
					excludeDocumentIds: [...data.data.ids, ...projectedDocumentIds],
					duplicateMessage: copy(
						"server:plugin.pages.full.slug.duplicate.on.delete",
					),
				},
			);
			if (checkFullSlugUniquenessRes.error) return checkFullSlugUniquenessRes;

			const updateFullSlugFieldsRes = await updateFullSlugFields(context, {
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
