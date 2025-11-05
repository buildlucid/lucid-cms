import { prefixGeneratedColName } from "@lucidcms/core/helpers";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import T from "../translations/index.js";

export type ParentPageQueryResponse = {
	_slug: string | null;
	_fullSlug: string | null;
	_parentPage: number | null;
	document_id: number;
	locale: string;
};

/**
 *  Get the parent document pages fields
 */
const getParentFields: ServiceFn<
	[
		{
			defaultLocale: string;
			versionType: Exclude<DocumentVersionType, "revision">;
			fields: {
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	Array<ParentPageQueryResponse>
> = async (context, data) => {
	try {
		const { version: versionTable, documentFields: fieldsTable } = data.tables;

		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
		const parentPageColumn = prefixGeneratedColName(
			constants.fields.parentPage.key,
		);
		const fullSlugColumn = prefixGeneratedColName(
			constants.fields.fullSlug.key,
		);

		const parentFields = await context.db
			.selectFrom(fieldsTable)
			.innerJoin(
				versionTable,
				`${versionTable}.id`,
				`${fieldsTable}.document_version_id`,
			)
			.select([
				`${fieldsTable}.${slugColumn}`,
				`${fieldsTable}.${fullSlugColumn}`,
				`${fieldsTable}.${parentPageColumn}`,
				`${versionTable}.document_id`,
				`${fieldsTable}.locale`,
			])
			.where(`${versionTable}.document_id`, "=", data.fields.parentPage.value)
			.where(`${versionTable}.type`, "=", data.versionType)
			.execute();

		if (!parentFields || parentFields.length === 0) {
			return {
				error: {
					type: "basic",
					status: 404,
					message: T(
						"parent_page_not_found_or_doesnt_have_a_published_version",
					),
					errors: {
						fields: [
							{
								key: constants.fields.parentPage.key,
								localeCode: data.defaultLocale,
								message: T(
									"parent_page_not_found_or_doesnt_have_a_published_version",
								),
							},
						],
					},
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: parentFields as unknown as Array<ParentPageQueryResponse>,
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("an_unknown_error_occurred_getting_parent_fields"),
			},
			data: undefined,
		};
	}
};

export default getParentFields;
