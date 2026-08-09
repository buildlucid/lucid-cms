import type { CollectionBuilder } from "@lucidcms/core";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../../../types/types.js";
import constructParentFullSlug from "../../construct-parent-fullslug.js";
import getParentFields from "../../get-parent-fields.js";
import resolveRoutePrefix from "../../resolve-route-prefix.js";

const resolveParentFullSlug: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			collectionKey: string;
			versionType: Exclude<DocumentVersionType, "revision">;
			tables: CollectionTableNames;
			fields: {
				slug: FieldInputSchema;
				parentPage: FieldInputSchema;
				all: FieldInputSchema[];
			};
			documentVersionId?: number;
			missingParentIsEmpty?: boolean;
		},
	],
	Record<string, string | null>
> = async (context, data) => {
	const [parentFieldsRes, routePrefixRes] = await Promise.all([
		getParentFields(context, {
			defaultLocale: context.config.localization.defaultLocale,
			versionType: data.versionType,
			collectionKey: data.collectionKey,
			fields: {
				parentPage: data.fields.parentPage,
			},
			tables: data.tables,
			missingParentIsEmpty: data.missingParentIsEmpty,
		}),
		resolveRoutePrefix(context, {
			collection: data.collection,
			collectionInstance: data.collectionInstance,
			versionType: data.versionType,
			fields:
				data.documentVersionId === undefined ? data.fields.all : undefined,
			versionId: data.documentVersionId,
		}),
	]);
	if (parentFieldsRes.error) return parentFieldsRes;
	if (routePrefixRes.error) return routePrefixRes;

	return constructParentFullSlug({
		parentFields: parentFieldsRes.data,
		localization: context.config.localization,
		collection: data.collection,
		fields: {
			slug: data.fields.slug,
		},
		routePrefixes: routePrefixRes.data,
	});
};

export default resolveParentFullSlug;
