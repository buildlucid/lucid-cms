import { copy } from "@lucidcms/core";
import type {
	CollectionTableNames,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import type { RouteScope } from "../types/types.js";
import getParentPageId from "../utils/get-parent-page-id.js";
import getPagesFields, { type PageFieldsRow } from "./get-pages-fields.js";

export type ParentPageQueryResponse = PageFieldsRow & {
	document_id: number;
};

/**
 * Reads the parent page's route fields in the scope's version of it. A parent
 * without that version is an error.
 */
const getParentFields: ServiceFn<
	[
		{
			defaultLocale: string | null;
			scope: RouteScope;
			collectionKey: string;
			fields: {
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	Array<ParentPageQueryResponse>
> = async (context, data) => {
	const parentPageId = getParentPageId(data.fields.parentPage);
	if (parentPageId === null) {
		return {
			error: undefined,
			data: [],
		};
	}

	const parentRes = await getPagesFields(context, {
		collectionKey: data.collectionKey,
		scope: data.scope,
		tables: data.tables,
		documentIds: [parentPageId],
	});
	if (parentRes.error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.parents.fields.fetch.failed"),
			},
			data: undefined,
		};
	}

	const parent = parentRes.data[0];
	if (!parent) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy(
					"server:plugin.pages.parents.published.version.not.found",
				),
				errors: {
					fields: [
						{
							key: constants.fields.parentPage.key,
							localeCode: data.defaultLocale,
							message: copy(
								"server:plugin.pages.parents.published.version.not.found",
							),
						},
					],
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: parent.rows.map((row) => ({
			...row,
			document_id: parent.document_id,
		})),
	};
};

export default getParentFields;
