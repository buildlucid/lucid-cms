import { prefixGeneratedColName } from "@lucidcms/core/helpers";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import T from "../../translations/index.js";

/**
 *  Recursively checks all parent pages for a circular reference and errors in that case
 */
const checkCircularParents: ServiceFn<
	[
		{
			defaultLocale: string;
			documentId: number;
			versionType: Exclude<DocumentVersionType, "revision">;
			fields: {
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	undefined
> = async (context, data) => {
	try {
		if (!data.documentId || !data.fields.parentPage.value) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const { version: versionTable, documentFields: fieldsTable } = data.tables;

		const parentPageField = prefixGeneratedColName(
			constants.fields.parentPage.key,
		);

		const result = await context.db
			.withRecursive("ancestors", (db) =>
				db
					.selectFrom(fieldsTable)
					.innerJoin(
						versionTable,
						`${versionTable}.id`,
						`${fieldsTable}.document_version_id`,
					)
					.select([
						`${versionTable}.document_id as current_id`,
						`${fieldsTable}.${parentPageField} as parent_id`,
					])
					.where(`${fieldsTable}.locale`, "=", data.defaultLocale)
					.where(`${versionTable}.type`, "=", data.versionType)
					.where(
						`${versionTable}.document_id`,
						"=",
						data.fields.parentPage.value,
					)
					.unionAll(
						db
							.selectFrom(fieldsTable)
							.innerJoin(
								versionTable,
								`${versionTable}.id`,
								`${fieldsTable}.document_version_id`,
							)
							.innerJoin(
								"ancestors",
								"ancestors.parent_id",
								`${versionTable}.document_id`,
							)
							.select([
								`${versionTable}.document_id as current_id`,
								`${fieldsTable}.${parentPageField} as parent_id`,
							])
							.where(`${fieldsTable}.locale`, "=", data.defaultLocale)
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
	} catch (error) {
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
