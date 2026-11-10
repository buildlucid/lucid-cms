import { LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import { resolveRouteScope } from "../../utils/route-scope.js";
import recordPaths from "../record-paths.js";
import updateRouteFields from "../update-route-fields.js";
import buildDescendantPaths from "./helpers/build-descendant-paths.js";
import propagateRouteSegmentUpdates from "./helpers/propagate-route-segment-updates.js";

/**
 * Rewrites descendant routes once a page is saved and records the page's own
 * published path. A request write only rewrites descendants captured in the
 * same request. Route-segment changes only propagate from latest and
 * environment versions.
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
		const currentPathField = data.fields.find(
			(field) => field.key === constants.fields.path.key,
		);
		if (pageCollection && currentPathField) {
			const docPathsRes = await buildDescendantPaths(context, {
				documentIds: [data.documentId],
				scope,
				tables: meta.collectionTableNames,
				collection: pageCollection,
				collectionInstance: meta.collection,
				parentPathField: currentPathField,
			});
			if (docPathsRes.error) throw new LucidError(docPathsRes.error);

			if (docPathsRes.data.length > 0) {
				const updateRes = await updateRouteFields(context, {
					collection: pageCollection,
					field: "path",
					excludeDocumentIds: [data.documentId],
					values: docPathsRes.data,
					scope,
					tables: meta.collectionTableNames,
					toolkit,
				});
				if (updateRes.error) throw new LucidError(updateRes.error);
			}

			//* the save wrote this page's own path, so updateRouteFields didn't record it
			const pathValue = (value: unknown) =>
				typeof value === "string" ? value : null;
			const recordRes = await recordPaths(context, {
				collection: pageCollection,
				scope,
				values: [
					{
						documentId: data.documentId,
						versionId: data.versionId,
						values: currentPathField.translations
							? new Map(
									Object.entries(currentPathField.translations).map(
										([locale, value]) => [locale, pathValue(value)],
									),
								)
							: new Map([[null, pathValue(currentPathField.value)]]),
					},
				],
			});
			if (recordRes.error) throw new LucidError(recordRes.error);
		}
		if (scope.type !== "version") {
			return;
		}

		// ----------------------------------------------------------------
		const result = await propagateRouteSegmentUpdates(context, {
			toolkit,
			options,
			targetCollectionKey: meta.collectionKey,
			targetDocumentId: data.documentId,
			targetVersionType: scope.versionType,
		});
		if (result.error) throw new LucidError(result.error);
		return;
	};

export default afterUpsertHandler;
