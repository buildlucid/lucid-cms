import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../../../types/types.js";
import constructChildFullSlug from "../../construct-child-fullslugs.js";
import getDescendantFields from "../../get-descendant-fields.js";

const buildDescendantFullSlugs: ServiceFn<
	[
		{
			documentIds: number[];
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			tables: CollectionTableNames;
			collection: CollectionConfig;
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

	return constructChildFullSlug({
		descendants: descendantsRes.data,
		localization: context.config.localization,
		parentFullSlugField: data.parentFullSlugField,
		collection: data.collection,
	});
};

export default buildDescendantFullSlugs;
