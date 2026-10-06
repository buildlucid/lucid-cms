import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import { resolveRouteScope } from "../../utils/route-scope.js";
import updateRouteFields from "../update-route-fields.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";
import propagateRouteSegmentUpdates from "./helpers/propagate-route-segment-updates.js";

/**
 * Rewrites descendant routes once a page is saved. A request write only
 * rewrites descendants captured in the same request. Route-segment changes
 * only propagate from latest and environment versions.
 */
const afterUpsertHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"afterUpsert">["handler"] =>
	async ({ context, toolkit, data, meta }) => {
		const scope = resolveRouteScope({
			versionType: data.versionType,
			request: meta.request,
			collectionKey: meta.collectionKey,
		});

		// ----------------------------------------------------------------
		const pageCollection = options.collections.find(
			(collection) => collection.key === meta.collectionKey,
		);
		const currentFullSlugField = data.fields.find(
			(field) => field.key === constants.fields.fullSlug.key,
		);
		if (pageCollection && currentFullSlugField) {
			const docFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: [data.documentId],
				scope,
				tables: meta.collectionTableNames,
				collection: pageCollection,
				collectionInstance: meta.collection,
				parentFullSlugField: currentFullSlugField,
			});
			if (docFullSlugsRes.error) return docFullSlugsRes;

			if (docFullSlugsRes.data.length > 0) {
				const updateRes = await updateRouteFields(context, {
					collectionKey: meta.collectionKey,
					field: "fullSlug",
					excludeDocumentIds: [data.documentId],
					values: docFullSlugsRes.data,
					scope,
					tables: meta.collectionTableNames,
					toolkit,
				});
				if (updateRes.error) return updateRes;
			}
		}
		if (scope.type !== "version") {
			return { error: undefined, data: undefined };
		}

		// ----------------------------------------------------------------
		return propagateRouteSegmentUpdates(context, {
			toolkit,
			options,
			targetCollectionKey: meta.collectionKey,
			targetDocumentId: data.documentId,
			targetVersionType: scope.versionType,
		});
	};

export default afterUpsertHandler;
