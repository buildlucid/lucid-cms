import type {
	CollectionDefinition,
	CollectionTableNames,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type {
	CollectionConfig,
	ProjectedPath,
	RouteScope,
} from "../../../types/types.js";
import resolvePagesCollectionLocalization from "../../../utils/resolve-pages-collection-localization.js";
import { scopeRelationVersionType } from "../../../utils/route-scope.js";
import constructChildPath from "../../construct-child-paths.js";
import getDescendantFields from "../../get-descendant-fields.js";
import resolveStoredRoutePrefixes from "../../resolve-stored-route-prefixes.js";

/** Projects new paths for every descendant version the scope may rewrite. */
const buildDescendantPaths: ServiceFn<
	[
		{
			documentIds: number[];
			scope: RouteScope;
			tables: CollectionTableNames;
			collection: CollectionConfig;
			collectionInstance: CollectionDefinition;
			parentPathField?: FieldInputSchema;
		},
	],
	ProjectedPath[]
> = async (context, data) => {
	const localization = resolvePagesCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
	});

	const descendantsRes = await getDescendantFields(context, {
		ids: data.documentIds,
		scope: data.scope,
		collectionKey: data.collection.key,
		tables: data.tables,
	});
	if (descendantsRes.error) return descendantsRes;
	const routePrefixesRes = await resolveStoredRoutePrefixes(context, {
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		versionType: scopeRelationVersionType(data.scope),
		versionIds: descendantsRes.data.map(
			(descendant) => descendant.document_version_id,
		),
	});
	if (routePrefixesRes.error) return routePrefixesRes;

	return constructChildPath({
		descendants: descendantsRes.data,
		localization,
		parentPathField: data.parentPathField,
		collection: data.collection,
		routePrefixes: routePrefixesRes.data,
	});
};

export default buildDescendantPaths;
