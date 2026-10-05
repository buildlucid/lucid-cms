import type { CollectionBuilder } from "@lucidcms/core";
import type {
	CollectionTableNames,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteScope,
} from "../../../types/types.js";
import resolvePagesCollectionLocalization from "../../../utils/resolve-pages-collection-localization.js";
import { scopeRelationVersionType } from "../../../utils/route-scope.js";
import constructChildFullSlug from "../../construct-child-fullslugs.js";
import getDescendantFields from "../../get-descendant-fields.js";
import resolveStoredRoutePrefixes from "../../resolve-stored-route-prefixes.js";

/** Projects new full slugs for every descendant version the scope may rewrite. */
const buildDescendantFullSlugs: ServiceFn<
	[
		{
			documentIds: number[];
			scope: RouteScope;
			tables: CollectionTableNames;
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			parentFullSlugField?: FieldInputSchema;
		},
	],
	ProjectedFullSlug[]
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

	return constructChildFullSlug({
		descendants: descendantsRes.data,
		localization,
		parentFullSlugField: data.parentFullSlugField,
		collection: data.collection,
		routePrefixes: routePrefixesRes.data,
	});
};

export default buildDescendantFullSlugs;
