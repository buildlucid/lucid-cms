import T from "../translations/index.js";
import constants from "../constants.js";
import type {
	ServiceFn,
	DocumentVersionType,
	LucidDocumentTableName,
	LucidVersionTableName,
	LucidBrickTableName,
} from "@lucidcms/core/types";
import { prefixGeneratedColName } from "@lucidcms/core/helpers";

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
		const parentPageColumn = prefixGeneratedColName(
			constants.fields.parentPage.key,
		);

		const fields = await context.db
			.selectFrom(fieldsTable)
			.innerJoin(
				versionTable,
				`${versionTable}.id`,
				`${fieldsTable}.document_version_id`,
			)
			.select([
				`${fieldsTable}.locale`,
				`${versionTable}.document_id`,
				`${fieldsTable}.${slugColumn}`,
				`${fieldsTable}.${fullSlugColumn}`,
				`${fieldsTable}.${parentPageColumn}`,
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
	} catch (error) {
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
