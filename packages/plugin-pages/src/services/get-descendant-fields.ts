import { inspect } from "node:util";
import { prefixGeneratedColName } from "@lucidcms/core/helpers";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import T from "../translations/index.js";
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

		const descendants = await context.db.client
			.withRecursive("recursive_cte", (db) =>
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
						eb(`${parentPageTable}.${parentPageColumn}`, "in", data.ids),
					)
					.where(`${versionTable}.type`, "=", data.versionType)
					.unionAll(
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
			.execute();

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
				message: T("an_unknown_error_occurred_getting_descendant_fields"),
			},
			data: undefined,
		};
	}
};

export default getDescendantFields;
