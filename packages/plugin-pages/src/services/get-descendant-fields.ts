import { copy } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	LucidBrickTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import type { RouteScope } from "../types/types.js";
import getCollectionDefaultLocale from "../utils/get-collection-default-locale.js";
import getParentPageRelationTable from "../utils/get-parent-page-relation-table.js";
import resolveInheritedLocaleRows from "../utils/resolve-inherited-locale-rows.js";
import { scopeMemberFilter } from "../utils/route-scope.js";
import type { PageVersionFields } from "./get-pages-fields.js";

/**
 * Walks down from the given pages through the versions the scope may rewrite,
 * returning each descendant version's route fields. The walk uses UNION, so a
 * loop among descendants ends it instead of recursing forever.
 */
const getDescendantFields: ServiceFn<
	[
		{
			ids: number[];
			scope: RouteScope;
			collectionKey: string;
			tables: {
				documentFields: LucidBrickTableName;
				version: LucidVersionTableName;
			};
		},
	],
	Array<PageVersionFields>
> = async (context, data) => {
	try {
		if (data.ids.length === 0) {
			return {
				error: undefined,
				data: [],
			};
		}

		const { documentFields: fieldsTable, version: versionTable } = data.tables;
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

		const query = context.db.kysely
			.withRecursive("recursive_cte", (cte) =>
				cte
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
						eb(`${parentPageTable}.${parentPageColumn}`, "in", data.ids),
					)
					.where(`${parentPageTable}.locale`, "is", null)
					.where(scopeMemberFilter(versionTable, data.scope))
					.union(
						cte
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
							.where(`${parentPageTable}.locale`, "is", null)
							.where(scopeMemberFilter(versionTable, data.scope)),
					),
			)
			.selectFrom("recursive_cte")
			.select((eb) => [
				"document_id",
				"document_version_id",
				context.db.fn
					.jsonArrayFrom(
						eb
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
									.on(`${defaultFieldsAlias}.locale`, "is", null),
							)
							.leftJoin(parentPageTable, (join) =>
								join
									.onRef(
										`${parentPageTable}.parent_id`,
										"=",
										`${defaultFieldsAlias}.id`,
									)
									.on(`${parentPageTable}.locale`, "is", null),
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
							.where(scopeMemberFilter(versionTable, data.scope)),
					)
					.as("rows"),
			])
			.where(({ eb }) => eb("document_id", "not in", data.ids));

		const descendantsResult = await context.db
			.query("pages.descendant-fields.find", () => query)
			.many();
		if (descendantsResult.error) return descendantsResult;
		const descendants = descendantsResult.data as PageVersionFields[];

		return {
			error: undefined,
			data: descendants
				.map((d) => ({
					...d,
					rows: resolveInheritedLocaleRows(
						d.rows,
						getCollectionDefaultLocale(context.config, data.collectionKey),
					),
				}))
				.filter((d, i, self) => {
					return (
						self.findIndex(
							(e) =>
								e.document_id === d.document_id &&
								e.document_version_id === d.document_version_id,
						) === i
					);
				}),
		};
	} catch (_error) {
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
