import { prefixGeneratedColName } from "@lucidcms/core/helpers";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import T from "../translations/index.js";
import getParentPageRelationTable from "../utils/get-parent-page-relation-table.js";

export type VersionFieldsQueryResponse = {
	locale: string;
	document_id: number;
	_slug: string | null;
	_fullSlug: string | null;
	_parentPage: number | null;
};

/**
 *  Get the target document versions slug, fullSlug and parentPage fields
 */
const getDocumentVersionFields: ServiceFn<
	[
		{
			documentId: number;
			versionId: number;
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			tables: {
				document: LucidDocumentTableName;
				version: LucidVersionTableName;
				documentFields: LucidBrickTableName;
			};
		},
	],
	Array<VersionFieldsQueryResponse> | null
> = async (context, data) => {
	try {
		const { version: versionTable, documentFields: fieldsTable } = data.tables;
		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
		const fullSlugColumn = prefixGeneratedColName(
			constants.fields.fullSlug.key,
		);
		const parentPageColumn = prefixGeneratedColName("document_id");
		const parentPageTableRes = getParentPageRelationTable(
			data.collectionKey,
			context.config.db.config.tableNameByteLimit,
		);
		if (parentPageTableRes.error) return parentPageTableRes;
		const parentPageTable = parentPageTableRes.data;

		const fields = await context.db.client
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
				`${fieldsTable}.locale`,
				`${versionTable}.document_id`,
				`${fieldsTable}.${slugColumn}`,
				`${fieldsTable}.${fullSlugColumn}`,
				`${parentPageTable}.${parentPageColumn}`,
			])
			.where(`${versionTable}.document_id`, "=", data.documentId)
			.where(`${versionTable}.id`, "=", data.versionId)
			.where(`${versionTable}.type`, "=", data.versionType)
			.execute();

		if (!fields || fields.length === 0) {
			return {
				error: undefined,
				data: null,
			};
		}

		return {
			error: undefined,
			data: fields as unknown as VersionFieldsQueryResponse[],
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("an_unknown_error_occurred_getting_document_version_fields"),
			},
			data: undefined,
		};
	}
};

export default getDocumentVersionFields;
