import { prefixGeneratedColName } from "@lucidcms/core/helpers";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldError,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import T from "../../translations/index.js";

/**
 *  Query for document fields that have same slug and parentPage for each slug translation (would cause duplicate fullSlug)
 */
const checkDuplicateSlugParents: ServiceFn<
	[
		{
			documentId: number;
			versionId: number;
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			fields: {
				slug: FieldInputSchema;
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	undefined
> = async (context, data) => {
	try {
		const {
			document: documentTable,
			version: versionTable,
			documentFields: fieldsTable,
		} = data.tables;

		const slugConditions = Object.entries(
			data.fields.slug.translations || {},
		).map(([localeCode, slug]) => ({
			localeCode,
			slug,
		}));

		if (data.fields.slug.value) {
			slugConditions.push({
				localeCode: context.config.localization.defaultLocale,
				slug: data.fields.slug.value,
			});
		}

		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
		const parentPageColumn = prefixGeneratedColName(
			constants.fields.parentPage.key,
		);

		const duplicates = await context.db
			.selectFrom(documentTable)
			.leftJoin(
				versionTable,
				// @ts-expect-error
				`${versionTable}.document_id`,
				`${documentTable}.id`,
			)
			.leftJoin(
				fieldsTable,
				// @ts-expect-error
				`${fieldsTable}.document_version_id`,
				`${versionTable}.id`,
			)
			// @ts-expect-error
			.select([
				`${documentTable}.id`,
				`${documentTable}.collection_key`,
				`${fieldsTable}.${slugColumn}`,
				`${fieldsTable}.locale`,
				`${fieldsTable}.${parentPageColumn}`,
			])
			// @ts-expect-error
			.where(({ eb, and, or }) =>
				and([
					or(
						slugConditions.map(({ localeCode, slug }) =>
							and([
								eb(`${fieldsTable}.${slugColumn}`, "=", slug),
								localeCode
									? eb(`${fieldsTable}.locale`, "=", localeCode)
									: eb(`${fieldsTable}.locale`, "is", null),
							]),
						),
					),
					data.fields.parentPage.value
						? eb(
								`${fieldsTable}.${parentPageColumn}`,
								"=",
								data.fields.parentPage.value,
							)
						: eb(`${fieldsTable}.${parentPageColumn}`, "is", null),
					eb(`${versionTable}.type`, "=", data.versionType),
				]),
			)
			.where(`${documentTable}.id`, "!=", data.documentId || null)
			.where(`${documentTable}.collection_key`, "=", data.collectionKey)
			.where(
				`${documentTable}.is_deleted`,
				"=",
				context.config.db.getDefault("boolean", "false"),
			)
			.execute();

		if (duplicates.length > 0) {
			const fieldErrors: FieldError[] = [];
			for (const duplicate of duplicates) {
				fieldErrors.push({
					key: constants.fields.slug.key,
					localeCode: duplicate.locale || undefined,
					message:
						duplicate[parentPageColumn] === null
							? T("duplicate_slug_field_found_message")
							: T("duplicate_slug_and_parent_page_field_found_message"),
				});
			}
			return {
				error: {
					type: "basic",
					status: 400,
					message: T("duplicate_slug_field_found_message"),
					errors: {
						fields: fieldErrors,
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
				message: T("an_unknown_error_occurred_checking_for_duplicate_slugs"),
			},
			data: undefined,
		};
	}
};

export default checkDuplicateSlugParents;
