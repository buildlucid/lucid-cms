import { prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import T from "../translations/index.js";
import getParentPageId from "../utils/get-parent-page-id.js";
import getParentPageRelationTable from "../utils/get-parent-page-relation-table.js";

export type ParentPageQueryResponse = {
	_slug: string | null;
	_fullSlug: string | null;
	_parentPage: number | null;
	document_id: number;
	locale: string;
};

/**
 *  Get the parent document pages fields
 */
const getParentFields: ServiceFn<
	[
		{
			defaultLocale: string;
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			fields: {
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	Array<ParentPageQueryResponse>
> = async (context, data) => {
	try {
		const parentPageId = getParentPageId(data.fields.parentPage);
		if (parentPageId === null) {
			return {
				error: undefined,
				data: [],
			};
		}

		const { version: versionTable, documentFields: fieldsTable } = data.tables;

		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
		const parentPageColumn = prefixGeneratedColName("document_id");
		const fullSlugColumn = prefixGeneratedColName(
			constants.fields.fullSlug.key,
		);
		const parentPageTableRes = getParentPageRelationTable(
			data.collectionKey,
			context.config.db.config.tableNameByteLimit,
		);
		if (parentPageTableRes.error) return parentPageTableRes;
		const parentPageTable = parentPageTableRes.data;

		const parentFields = await context.db.client
			.selectFrom(fieldsTable)
			.innerJoin(
				versionTable,
				`${versionTable}.id`,
				`${fieldsTable}.document_version_id`,
			)
			.leftJoin(
				parentPageTable,
				`${parentPageTable}.parent_id`,
				`${fieldsTable}.id`,
			)
			// @ts-expect-error
			.select([
				`${fieldsTable}.${slugColumn}`,
				`${fieldsTable}.${fullSlugColumn}`,
				`${parentPageTable}.${parentPageColumn}`,
				`${versionTable}.document_id`,
				`${fieldsTable}.locale`,
			])
			.where(`${versionTable}.document_id`, "=", parentPageId)
			.where(`${versionTable}.type`, "=", data.versionType)
			.execute();

		if (!parentFields || parentFields.length === 0) {
			return {
				error: {
					type: "basic",
					status: 404,
					message: T(
						"parent_page_not_found_or_doesnt_have_a_published_version",
					),
					errors: {
						fields: [
							{
								key: constants.fields.parentPage.key,
								localeCode: data.defaultLocale,
								message: T(
									"parent_page_not_found_or_doesnt_have_a_published_version",
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
			data: parentFields as unknown as Array<ParentPageQueryResponse>,
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("an_unknown_error_occurred_getting_parent_fields"),
			},
			data: undefined,
		};
	}
};

export default getParentFields;
