import { prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import T from "../../translations/index.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import getParentPageRelationTable from "../../utils/get-parent-page-relation-table.js";

/**
 *  Recursively checks all parent pages for a circular reference and errors in that case
 */
const checkCircularParents: ServiceFn<
	[
		{
			defaultLocale: string;
			documentId: number;
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			fields: {
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	undefined
> = async (context, data) => {
	try {
		const parentPageId = getParentPageId(data.fields.parentPage);

		if (!data.documentId || parentPageId === null) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const { version: versionTable } = data.tables;
		const parentPageField = prefixGeneratedColName("document_id");
		const parentPageTableRes = getParentPageRelationTable(
			data.collectionKey,
			context.config.db.config.tableNameByteLimit,
		);
		if (parentPageTableRes.error) return parentPageTableRes;
		const parentPageTable = parentPageTableRes.data;

		const result = await context.db.client
			.withRecursive("ancestors", (db) =>
				db
					.selectFrom(parentPageTable)
					.innerJoin(
						versionTable,
						`${versionTable}.id`,
						`${parentPageTable}.document_version_id`,
					)
					.select([
						`${versionTable}.document_id as current_id`,
						`${parentPageTable}.${parentPageField} as parent_id`,
					])
					.where(`${parentPageTable}.locale`, "=", data.defaultLocale)
					.where(`${versionTable}.type`, "=", data.versionType)
					.where(`${versionTable}.document_id`, "=", parentPageId)
					.unionAll(
						db
							.selectFrom(parentPageTable)
							.innerJoin(
								versionTable,
								`${versionTable}.id`,
								`${parentPageTable}.document_version_id`,
							)
							.innerJoin(
								"ancestors",
								"ancestors.parent_id",
								`${versionTable}.document_id`,
							)
							.select([
								`${versionTable}.document_id as current_id`,
								`${parentPageTable}.${parentPageField} as parent_id`,
							])
							.where(`${parentPageTable}.locale`, "=", data.defaultLocale)
							.where(`${versionTable}.type`, "=", data.versionType),
					),
			)
			.selectFrom("ancestors")
			.select("parent_id")
			.where("parent_id", "=", data.documentId)
			.executeTakeFirst();

		if (result) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: T("circular_parents_error_message"),
					errors: {
						fields: [
							{
								key: constants.fields.parentPage.key,
								localeCode: data.defaultLocale, //* parentPage doesnt use translations so always use default locale
								message: T("circular_parents_error_message"),
							},
						],
					},
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: undefined,
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("an_unknown_error_occurred_checking_for_circular_parents"),
			},
			data: undefined,
		};
	}
};

export default checkCircularParents;
