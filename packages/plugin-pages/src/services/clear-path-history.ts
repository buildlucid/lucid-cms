import { copy } from "@lucidcms/core";
import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { ServiceFn } from "@lucidcms/core/types";
import { PATH_HISTORY_TABLE } from "../constants.js";
import type { PathHistoryTables } from "../types/tables.js";
import type { PluginOptionsInternal, RouteScope } from "../types/types.js";
import getRouteVersionTypes from "../utils/get-route-version-types.js";
import isPublishedVersion from "../utils/is-published-version.js";
import resolvePagesCollectionLocalization from "../utils/resolve-pages-collection-localization.js";
import getPageDocumentIds from "./get-page-document-ids.js";
import getPagesFields from "./get-pages-fields.js";
import recordStoredPaths from "./record-stored-paths.js";

/**
 * Forgets every page's old paths, so none of them redirect, then records the paths pages use now so
 * their next change still redirects. Run in a transaction.
 */
const clearPathHistory: ServiceFn<
	[{ options: PluginOptionsInternal }],
	undefined
> = async (context, data) => {
	try {
		const query = context.db.kysely
			.$extendTables<PathHistoryTables>()
			.deleteFrom(PATH_HISTORY_TABLE);
		const deleteRes = await context.db
			.query("pages.path-history.clear", () => query)
			.many();
		if (deleteRes.error) return deleteRes;
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.path.history.clear.failed"),
			},
			data: undefined,
		};
	}

	for (const collection of data.options.collections) {
		const collectionInstance = context.config.collections.find(
			(instance) => instance.key === collection.key,
		);
		if (!collectionInstance) continue;

		const tablesRes = await getCollectionTableNames(context, collection.key);
		if (tablesRes.error) return tablesRes;

		const documentIdsRes = await getPageDocumentIds(context, {
			collectionKey: collection.key,
			tables: tablesRes.data,
		});
		if (documentIdsRes.error) return documentIdsRes;

		const { enabled: localized } = resolvePagesCollectionLocalization({
			localization: context.config.localization,
			collection,
			collectionInstance,
		});

		//* drafts never record paths, so only published versions are read
		const versionTypes = getRouteVersionTypes(collectionInstance).filter(
			(versionType) => isPublishedVersion(collectionInstance, versionType),
		);
		for (const versionType of versionTypes) {
			const scope: RouteScope = { type: "version", versionType };
			const versionsRes = await getPagesFields(context, {
				collectionKey: collection.key,
				scope,
				tables: tablesRes.data,
				documentIds: documentIdsRes.data,
			});
			if (versionsRes.error) return versionsRes;

			const recordRes = await recordStoredPaths(context, {
				collection,
				scope,
				versions: versionsRes.data,
				localized,
			});
			if (recordRes.error) return recordRes;
		}
	}

	return { error: undefined, data: undefined };
};

export default clearPathHistory;
