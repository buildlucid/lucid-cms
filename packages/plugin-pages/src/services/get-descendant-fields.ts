import T from "../translations/index.js";
import constants from "../constants.js";
import { prefixGeneratedColName } from "@lucidcms/core/helpers";
import type {
	ServiceFn,
	DocumentVersionType,
	LucidVersionTableName,
	LucidBrickTableName,
} from "@lucidcms/core/types";
import { inspect } from "node:util";

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
			tables: {
				documentFields: LucidBrickTableName;
				version: LucidVersionTableName;
			};
		},
	],
	Array<DescendantFieldsResponse>
> = async (context, data) => {
	try {
		const { documentFields: fieldsTable, version: versionTable } = data.tables;
		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
		const fullSlugColumn = prefixGeneratedColName(
			constants.fields.fullSlug.key,
		);
		const parentPageColumn = prefixGeneratedColName(
			constants.fields.parentPage.key,
		);

		const descendants = await context.db
			.withRecursive("recursive_cte", (db) =>
				db
					.selectFrom(fieldsTable)
					.innerJoin(
						versionTable,
						`${versionTable}.id`,
						`${fieldsTable}.document_version_id`,
					)
					.select([
						`${versionTable}.document_id as document_id`,
						`${fieldsTable}.${parentPageColumn} as parent_id`,
						`${fieldsTable}.document_version_id`,
					])
					.where(({ eb }) =>
						eb(`${fieldsTable}.${parentPageColumn}`, "in", data.ids),
					)
					.where(`${versionTable}.type`, "=", data.versionType)
					.unionAll(
						db
							.selectFrom(fieldsTable)
							.innerJoin(
								versionTable,
								`${versionTable}.id`,
								`${fieldsTable}.document_version_id`,
							)
							.innerJoin(
								"recursive_cte as rc",
								"rc.document_id",
								`${fieldsTable}.${parentPageColumn}`,
							)
							.select([
								`${versionTable}.document_id as document_id`,
								`${fieldsTable}.${parentPageColumn} as parent_id`,
								`${fieldsTable}.document_version_id`,
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
							.select([
								`${fieldsTable}.locale`,
								`${fieldsTable}.${slugColumn} as _slug`,
								`${fieldsTable}.${fullSlugColumn} as _fullSlug`,
								`${fieldsTable}.${parentPageColumn} as _parentPage`,
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
