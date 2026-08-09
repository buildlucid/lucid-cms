import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import { updateFullSlugFields } from "../index.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";
import propagateRouteSegmentUpdates from "./helpers/propagate-route-segment-updates.js";

const afterUpsertHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"afterUpsert">["handler"] =>
	async (context, data) => {
		// ----------------------------------------------------------------
		// Rebuild descendants when the changed document is itself a page.
		const pageCollection = options.collections.find(
			(collection) => collection.key === data.meta.collectionKey,
		);
		const currentFullSlugField = data.data.fields.find(
			(field) => field.key === constants.fields.fullSlug.key,
		);
		if (pageCollection && currentFullSlugField) {
			const docFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: [data.data.documentId],
				versionType: data.data.versionType,
				collectionKey: pageCollection.key,
				tables: data.meta.collectionTableNames,
				collection: pageCollection,
				collectionInstance: data.meta.collection,
				parentFullSlugField: currentFullSlugField,
			});
			if (docFullSlugsRes.error) return docFullSlugsRes;

			if (docFullSlugsRes.data.length > 0) {
				const updateFullSlugFieldsRes = await updateFullSlugFields(context, {
					docFullSlugs: docFullSlugsRes.data,
					versionType: data.data.versionType,
					tables: data.meta.collectionTableNames,
				});
				if (updateFullSlugFieldsRes.error) return updateFullSlugFieldsRes;
			}
		}

		// ----------------------------------------------------------------
		// Rebuild pages that use this document as a route segment.
		const propagationRes = await propagateRouteSegmentUpdates(context, {
			options,
			targetCollectionKey: data.meta.collectionKey,
			targetDocumentId: data.data.documentId,
			targetVersionType: data.data.versionType,
		});
		if (propagationRes.error) return propagationRes;

		return {
			error: undefined,
			data: undefined,
		};
	};

export default afterUpsertHandler;
