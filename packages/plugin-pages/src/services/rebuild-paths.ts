import { copy } from "@lucidcms/core";
import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { ServiceFn, Toolkit } from "@lucidcms/core/types";
import hookEvents from "../hook-events/index.js";
import type { PluginOptionsInternal, RouteScope } from "../types/types.js";
import findRebuildConflict from "../utils/find-rebuild-conflict.js";
import getRouteVersionTypes from "../utils/get-route-version-types.js";
import resolvePagesCollectionLocalization from "../utils/resolve-pages-collection-localization.js";
import constructChildPath from "./construct-child-paths.js";
import getPageDocumentIds from "./get-page-document-ids.js";
import getPagesFields from "./get-pages-fields.js";
import recordStoredPaths from "./record-stored-paths.js";
import resolveStoredRoutePrefixes from "./resolve-stored-route-prefixes.js";
import updateRouteFields from "./update-route-fields.js";

/**
 * Rebuilds latest and environment paths, promoting children of binned parents to top-level.
 * Records published paths before and after, then runs `pages.afterRebuildPaths`. Skips request
 * proposals. Run in a transaction to roll back conflicts and hook errors.
 */
const rebuildPaths: ServiceFn<
	[{ options: PluginOptionsInternal; toolkit: Toolkit }],
	undefined
> = async (context, data) => {
	const collectionKeys: string[] = [];

	for (const collection of data.options.collections) {
		const collectionInstance = context.config.collections.find(
			(instance) => instance.key === collection.key,
		);
		if (!collectionInstance) continue;
		collectionKeys.push(collection.key);

		const tablesRes = await getCollectionTableNames(context, collection.key);
		if (tablesRes.error) return tablesRes;
		const tables = tablesRes.data;

		const documentIdsRes = await getPageDocumentIds(context, {
			collectionKey: collection.key,
			tables,
		});
		if (documentIdsRes.error) return documentIdsRes;

		const localization = resolvePagesCollectionLocalization({
			localization: context.config.localization,
			collection,
			collectionInstance,
		});

		for (const versionType of getRouteVersionTypes(collectionInstance)) {
			const scope: RouteScope = { type: "version", versionType };
			const versionsRes = await getPagesFields(context, {
				collectionKey: collection.key,
				scope,
				tables,
				documentIds: documentIdsRes.data,
			});
			if (versionsRes.error) return versionsRes;

			const routePrefixesRes = await resolveStoredRoutePrefixes(context, {
				collection,
				collectionInstance,
				versionType,
				versionIds: versionsRes.data.map(
					(version) => version.document_version_id,
				),
			});
			if (routePrefixesRes.error) return routePrefixesRes;

			//* with every page version as a "descendant", each path is built from its root down
			const pathsRes = constructChildPath({
				descendants: versionsRes.data,
				localization,
				collection,
				routePrefixes: routePrefixesRes.data,
			});
			if (pathsRes.error) return pathsRes;

			//* recording stored paths starts tracking pages published before it, and keeps the paths a rebuild replaces
			const storedRes = await recordStoredPaths(context, {
				collection,
				scope,
				versions: versionsRes.data,
				localized: localization.enabled,
			});
			if (storedRes.error) return storedRes;

			if (pathsRes.data.length === 0) continue;

			const conflict = collection.unique
				? findRebuildConflict({
						versions: versionsRes.data,
						changed: pathsRes.data,
						localization,
					})
				: undefined;
			if (conflict) {
				return {
					error: {
						type: "basic",
						status: 400,
						message: copy("server:plugin.pages.rebuild.paths.duplicate", {
							data: { route: conflict.path, target: versionType },
						}),
					},
					data: undefined,
				};
			}

			const updateRes = await updateRouteFields(context, {
				toolkit: data.toolkit,
				collection,
				field: "path",
				scope,
				values: pathsRes.data,
				tables,
			});
			if (updateRes.error) return updateRes;
		}
	}

	return hookEvents.execute(context, "afterRebuildPaths", {
		meta: {},
		data: { collectionKeys },
	});
};

export default rebuildPaths;
