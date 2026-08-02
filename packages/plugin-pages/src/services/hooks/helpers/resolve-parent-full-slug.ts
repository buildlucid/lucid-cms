import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../../../types/types.js";
import constructParentFullSlug from "../../construct-parent-fullslug.js";
import getParentFields from "../../get-parent-fields.js";

const resolveParentFullSlug: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionKey: string;
			versionType: Exclude<DocumentVersionType, "revision">;
			tables: CollectionTableNames;
			fields: {
				slug: FieldInputSchema;
				parentPage: FieldInputSchema;
			};
			missingParentIsEmpty?: boolean;
		},
	],
	Record<string, string | null>
> = async (context, data) => {
	const parentFieldsRes = await getParentFields(context, {
		defaultLocale: context.config.localization.defaultLocale,
		versionType: data.versionType,
		collectionKey: data.collectionKey,
		fields: {
			parentPage: data.fields.parentPage,
		},
		tables: data.tables,
		missingParentIsEmpty: data.missingParentIsEmpty,
	});
	if (parentFieldsRes.error) return parentFieldsRes;

	return constructParentFullSlug({
		parentFields: parentFieldsRes.data,
		localization: context.config.localization,
		collection: data.collection,
		fields: {
			slug: data.fields.slug,
		},
	});
};

export default resolveParentFullSlug;
