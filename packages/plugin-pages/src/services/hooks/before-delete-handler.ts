import {
	getTargetCollection,
	constructChildFullSlug,
	getDescendantFields,
	updateFullSlugFields,
} from "../index.js";
import type { PluginOptionsInternal } from "../../types/index.js";
import type { LucidHookDocuments } from "@lucidcms/core/types";

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

		// Process both draft and published versions
		const versionTypes: ("draft" | "published")[] = ["draft", "published"];

		for (const versionType of versionTypes) {
			const descendantsRes = await getDescendantFields(context, {
				ids: data.data.ids,
				versionType,
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

			await updateFullSlugFields(context, {
				docFullSlugs: docFullSlugsRes.data,
				versionType,
				tables: data.meta.collectionTableNames,
			});
		}

		return {
			error: undefined,
			data: undefined,
		};
	};

export default beforeDeleteHandler;
