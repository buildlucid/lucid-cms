import { inspect } from "node:util";
import { copy, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import { applyDocumentVersionTenantScope } from "../utils/apply-tenant-scope.js";
import getParentPageRelationTable from "../utils/get-parent-page-relation-table.js";

export type DescendantFieldsResponse = {
	document_id: number;
	document_version_id: number;
	rows: {
		locale: string;
		_slug: string | null;
		_fullSlug: string | null;
		_parentPage: number | null;
	}[];
};

/**
 *  Get the descendant document pages fields
 */
const getDescendantFields: ServiceFn<
	[
		{
			ids: number[];
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			tables: {
				document: LucidDocumentTableName;
				documentFields: LucidBrickTableName;
				version: LucidVersionTableName;
			};
		},
	],
	Array<DescendantFieldsResponse>
> = async (context, data) => {
	try {
		if (data.ids.length === 0) {
			return {
				error: undefined,
				data: [],
			};
		}

		const {
			document: documentTable,
			documentFields: fieldsTable,
			version: versionTable,
		} = data.tables;
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

		const sourceDocuments = await context.db.client
			.selectFrom(documentTable)
			.select(["id", "tenant_key"])
			.where("id", "in", data.ids)
			.execute();

		const sourceIdsByTenant = new Map<string | null, number[]>();
		for (const sourceDocument of sourceDocuments) {
			const tenantKey = sourceDocument.tenant_key ?? null;
			sourceIdsByTenant.set(tenantKey, [
				...(sourceIdsByTenant.get(tenantKey) ?? []),
				sourceDocument.id,
			]);
		}

		const descendants = (
			await Promise.all(
				Array.from(sourceIdsByTenant.entries()).map(([tenantKey, ids]) =>
					context.db.client
						.withRecursive("recursive_cte", (db) =>
							applyDocumentVersionTenantScope(
								db
									.selectFrom(parentPageTable)
									.innerJoin(
										versionTable,
										`${versionTable}.id`,
										`${parentPageTable}.document_version_id`,
									)
									.select([
										`${versionTable}.document_id as document_id`,
										`${parentPageTable}.${parentPageColumn} as parent_id`,
										`${parentPageTable}.document_version_id`,
									])
									.where(({ eb }) =>
										eb(`${parentPageTable}.${parentPageColumn}`, "in", ids),
									)
									.where(`${versionTable}.type`, "=", data.versionType),
								{
									tenantKey,
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
											"recursive_cte as rc",
											"rc.document_id",
											`${parentPageTable}.${parentPageColumn}`,
										)
										.select([
											`${versionTable}.document_id as document_id`,
											`${parentPageTable}.${parentPageColumn} as parent_id`,
											`${parentPageTable}.document_version_id`,
										])
										.where(`${versionTable}.type`, "=", data.versionType),
									{
										tenantKey,
										documentTable,
										versionTable,
									},
								),
							),
						)
						.selectFrom("recursive_cte")
						.select((eb) => [
							"document_id",
							"document_version_id",
							context.config.db
								.jsonArrayFrom(
									eb
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
											`${fieldsTable}.${slugColumn} as _slug`,
											`${fieldsTable}.${fullSlugColumn} as _fullSlug`,
											`${parentPageTable}.${parentPageColumn} as _parentPage`,
										])
										.whereRef(
											`${versionTable}.document_id`,
											"=",
											"recursive_cte.document_id",
										)
										.where(`${versionTable}.type`, "=", data.versionType),
								)
								.as("rows"),
						])
						.where(({ eb }) => eb("document_id", "not in", data.ids))
						.execute(),
				),
			)
		).flat();

		return {
			error: undefined,
			data: descendants.filter((d, i, self) => {
				return (
					self.findIndex(
						(e) =>
							e.document_id === d.document_id &&
							e.document_version_id === d.document_version_id,
					) === i
				);
			}) as DescendantFieldsResponse[],
		};
	} catch (error) {
		console.log(
			inspect(error, {
				depth: Number.POSITIVE_INFINITY,
				colors: true,
			}),
		);
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.descendants.fields.fetch.failed"),
			},
			data: undefined,
		};
	}
};

export default getDescendantFields;
