import type { CollectionBuilder } from "@lucidcms/core";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../../../types/types.js";
import constructChildFullSlug from "../../construct-child-fullslugs.js";
import getDescendantFields from "../../get-descendant-fields.js";
import resolveStoredRoutePrefixes from "../../resolve-stored-route-prefixes.js";

const buildDescendantFullSlugs: ServiceFn<
	[
		{
			documentIds: number[];
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			tables: CollectionTableNames;
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			parentFullSlugField?: FieldInputSchema;
		},
	],
	Array<{
		documentId: number;
		versionId: number;
		fullSlugs: Record<string, string | null>;
	}>
> = async (context, data) => {
	const descendantsRes = await getDescendantFields(context, {
		ids: data.documentIds,
		versionType: data.versionType,
		collectionKey: data.collectionKey,
		tables: data.tables,
	});
	if (descendantsRes.error) return descendantsRes;
	const routePrefixesRes = await resolveStoredRoutePrefixes(context, {
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		versionType: data.versionType,
		versionIds: descendantsRes.data.map(
			(descendant) => descendant.document_version_id,
		),
	});
	if (routePrefixesRes.error) return routePrefixesRes;

	return constructChildFullSlug({
		descendants: descendantsRes.data,
		localization: context.config.localization,
		parentFullSlugField: data.parentFullSlugField,
		collection: data.collection,
		routePrefixes: routePrefixesRes.data,
	});
};

export default buildDescendantFullSlugs;
