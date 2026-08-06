import { copy, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
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
		const defaultFieldsAlias = "default_fields";

		const fieldsResult = await context.db
			.query("pages.version-fields.find", (db) =>
				db
					.selectFrom(fieldsTable)
					.innerJoin(
						versionTable,
						`${versionTable}.id`,
						`${fieldsTable}.document_version_id`,
					)
					.leftJoin(`${fieldsTable} as ${defaultFieldsAlias}`, (join) =>
						join
							.onRef(
								`${defaultFieldsAlias}.document_version_id`,
								"=",
								`${fieldsTable}.document_version_id`,
							)
							.on(
								`${defaultFieldsAlias}.locale`,
								"=",
								context.config.localization.defaultLocale,
							),
					)
					.leftJoin(parentPageTable, (join) =>
						join
							.onRef(
								`${parentPageTable}.parent_id`,
								"=",
								`${defaultFieldsAlias}.id`,
							)
							.on(
								`${parentPageTable}.locale`,
								"=",
								context.config.localization.defaultLocale,
							),
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
					.where(`${versionTable}.type`, "=", data.versionType),
			)
			.many();
		if (fieldsResult.error) return fieldsResult;

		const fields = fieldsResult.data;

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
				message: copy(
					"server:plugin.pages.documents.version.fields.fetch.failed",
				),
			},
			data: undefined,
		};
	}
};

export default getDocumentVersionFields;
