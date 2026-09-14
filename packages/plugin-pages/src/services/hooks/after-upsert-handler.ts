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
	async ({ context, toolkit, data, meta }) => {
		// ----------------------------------------------------------------
		// Rebuild descendants when the changed document is itself a page.
		const pageCollection = options.collections.find(
			(collection) => collection.key === meta.collectionKey,
		);
		const currentFullSlugField = data.fields.find(
			(field) => field.key === constants.fields.fullSlug.key,
		);
		if (pageCollection && currentFullSlugField) {
			const docFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: [data.documentId],
				versionType: data.versionType,
				collectionKey: pageCollection.key,
				tables: meta.collectionTableNames,
				collection: pageCollection,
				collectionInstance: meta.collection,
				parentFullSlugField: currentFullSlugField,
			});
			if (docFullSlugsRes.error) return docFullSlugsRes;

			if (docFullSlugsRes.data.length > 0) {
				const updateFullSlugFieldsRes = await updateFullSlugFields(context, {
					collectionKey: meta.collectionKey,
					excludeDocumentIds: [data.documentId],
					docFullSlugs: docFullSlugsRes.data,
					versionType: data.versionType,
					tables: meta.collectionTableNames,
					toolkit,
				});
				if (updateFullSlugFieldsRes.error) return updateFullSlugFieldsRes;
			}
		}

		// ----------------------------------------------------------------
		// Rebuild pages that use this document as a route segment.
		const propagationRes = await propagateRouteSegmentUpdates(context, {
			toolkit,
			options,
			targetCollectionKey: meta.collectionKey,
			targetDocumentId: data.documentId,
			targetVersionType: data.versionType,
		});
		if (propagationRes.error) return propagationRes;

		return {
			error: undefined,
			data: undefined,
		};
	};

export default afterUpsertHandler;
