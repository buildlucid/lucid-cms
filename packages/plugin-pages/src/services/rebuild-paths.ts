import { copy } from "@lucidcms/core";
import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { ServiceFn, Toolkit } from "@lucidcms/core/types";
import type { PluginOptionsInternal, RouteScope } from "../types/types.js";
import findRebuildConflict from "../utils/find-rebuild-conflict.js";
import getRouteVersionTypes from "../utils/get-route-version-types.js";
import resolvePagesCollectionLocalization from "../utils/resolve-pages-collection-localization.js";
import constructChildPath from "./construct-child-paths.js";
import getPagesFields from "./get-pages-fields.js";
import resolveStoredRoutePrefixes from "./resolve-stored-route-prefixes.js";
import updateRouteFields from "./update-route-fields.js";

/**
 * Rebuilds latest and environment paths, skipping binned pages and request proposals. Children of
 * binned parents become top-level. Run in a transaction so path conflicts roll back all changes.
 */
const rebuildPaths: ServiceFn<
	[{ options: PluginOptionsInternal; toolkit: Toolkit }],
	undefined
> = async (context, data) => {
	for (const collection of data.options.collections) {
		const collectionInstance = context.config.collections.find(
			(instance) => instance.key === collection.key,
		);
		if (!collectionInstance) continue;

		const tablesRes = await getCollectionTableNames(context, collection.key);
		if (tablesRes.error) return tablesRes;
		const tables = tablesRes.data;

		const documentsQuery = context.db.kysely
			.selectFrom(context.db.kysely.dynamic.table(tables.document).as("d"))
			.select("d.id")
			.where("d.collection_key", "=", collection.key)
			.where(
				"d.is_deleted",
				"=",
				context.config.db.getDefault("boolean", "false"),
			);
		const documentsRes = await context.db
			.query<{ id: number }>(
				"pages.rebuild-paths.documents",
				() => documentsQuery,
			)
			.many();
		if (documentsRes.error) return documentsRes;

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
				documentIds: documentsRes.data.map((document) => document.id),
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
				collectionKey: collection.key,
				field: "path",
				scope,
				values: pathsRes.data,
				tables,
			});
			if (updateRes.error) return updateRes;
		}
	}

	return { error: undefined, data: undefined };
};

export default rebuildPaths;
