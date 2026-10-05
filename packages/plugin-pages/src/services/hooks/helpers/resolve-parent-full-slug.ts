import type { CollectionBuilder } from "@lucidcms/core";
import type {
	CollectionTableNames,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig, RouteScope } from "../../../types/types.js";
import resolvePagesCollectionLocalization from "../../../utils/resolve-pages-collection-localization.js";
import { scopeRelationVersionType } from "../../../utils/route-scope.js";
import constructParentFullSlug from "../../construct-parent-fullslug.js";
import getParentFields from "../../get-parent-fields.js";
import resolveRoutePrefix from "../../resolve-route-prefix.js";

/** Builds a page's full slug from its parent in the scope, its route prefix and its slug. */
const resolveParentFullSlug: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			scope: RouteScope;
			tables: CollectionTableNames;
			fields: {
				slug: FieldInputSchema;
				parentPage: FieldInputSchema;
				all: FieldInputSchema[];
			};
			documentVersionId?: number;
		},
	],
	Map<string | null, string | null>
> = async (context, data) => {
	const localization = resolvePagesCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
	});

	const [parentFieldsRes, routePrefixRes] = await Promise.all([
		getParentFields(context, {
			defaultLocale: localization.defaultLocale,
			scope: data.scope,
			collectionKey: data.collection.key,
			fields: {
				parentPage: data.fields.parentPage,
			},
			tables: data.tables,
		}),
		resolveRoutePrefix(context, {
			collection: data.collection,
			collectionInstance: data.collectionInstance,
			versionType: scopeRelationVersionType(data.scope),
			fields:
				data.documentVersionId === undefined ? data.fields.all : undefined,
			versionId: data.documentVersionId,
		}),
	]);
	if (parentFieldsRes.error) return parentFieldsRes;
	if (routePrefixRes.error) return routePrefixRes;

	return constructParentFullSlug({
		parentFields: parentFieldsRes.data,
		localization,
		collection: data.collection,
		fields: {
			slug: data.fields.slug,
		},
		routePrefixes: routePrefixRes.data,
	});
};

export default resolveParentFullSlug;
