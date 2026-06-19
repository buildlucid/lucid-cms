import { copy, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import { applyDocumentVersionTenantScope } from "../../utils/apply-tenant-scope.js";
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
			tenantKey: string | null;
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

		const { document: documentTable, version: versionTable } = data.tables;
		const parentPageField = prefixGeneratedColName("document_id");
		const parentPageTableRes = getParentPageRelationTable(
			data.collectionKey,
			context.config.db.config.tableNameByteLimit,
		);
		if (parentPageTableRes.error) return parentPageTableRes;
		const parentPageTable = parentPageTableRes.data;

		const result = await context.db.client
			.withRecursive("ancestors", (db) =>
				applyDocumentVersionTenantScope(
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
						.where(`${versionTable}.document_id`, "=", parentPageId),
					{
						tenantKey: data.tenantKey,
						documentTable,
						versionTable,
					},
				).unionAll(
					applyDocumentVersionTenantScope(
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
						{
							tenantKey: data.tenantKey,
							documentTable,
							versionTable,
						},
					),
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
					message: copy("server:plugin.pages.parents.circular"),
					errors: {
						fields: [
							{
								key: constants.fields.parentPage.key,
								localeCode: data.defaultLocale, //* parentPage doesnt use translations so always use default locale
								message: copy("server:plugin.pages.parents.circular"),
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
				message: copy("server:plugin.pages.parents.circular.check.failed"),
			},
			data: undefined,
		};
	}
};

export default checkCircularParents;
