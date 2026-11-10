import { LucidError } from "@lucidcms/core";
import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { LucidHook } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import { requestScope } from "../../utils/route-scope.js";
import getDescendantFields from "../get-descendant-fields.js";
import getTargetCollection from "../get-target-collection.js";
import refreshVersionRoute from "./helpers/refresh-version-route.js";

/**
 * Once a page leaves a request, proposals still in it that sat below that
 * page read their parent from latest again. Refreshing each direct child
 * rewrites the captured pages beneath it.
 */
const requestDocumentRemovedHandler =
	(
		options: PluginOptionsInternal,
	): LucidHook<"requests", "afterDocumentRemove">["handler"] =>
	async ({ context, toolkit, data }) => {
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: data.collectionKey,
		});
		const collectionInstance = context.config.collections.find(
			(instance) => instance.key === data.collectionKey,
		);
		if (targetCollectionRes.error || !collectionInstance) {
			return;
		}

		const scope = requestScope({
			request: data.request,
			collectionKey: data.collectionKey,
			fallback: "latest",
		});
		if (scope.type !== "request" || scope.versions.size === 0) {
			return;
		}

		const tablesRes = await getCollectionTableNames(
			context,
			data.collectionKey,
		);
		if (tablesRes.error) throw new LucidError(tablesRes.error);

		const descendantsRes = await getDescendantFields(context, {
			ids: [data.documentId],
			scope,
			collectionKey: data.collectionKey,
			tables: tablesRes.data,
		});
		if (descendantsRes.error) throw new LucidError(descendantsRes.error);

		for (const descendant of descendantsRes.data) {
			const isChild = descendant.rows.some(
				(row) => row._parentPage === data.documentId,
			);
			if (!isChild) continue;

			const refreshRes = await refreshVersionRoute(context, {
				collection: targetCollectionRes.data,
				collectionInstance,
				tables: tablesRes.data,
				toolkit,
				scope,
				documentId: descendant.document_id,
				versionId: descendant.document_version_id,
			});
			if (refreshRes.error) throw new LucidError(refreshRes.error);
		}

		return;
	};

export default requestDocumentRemovedHandler;
