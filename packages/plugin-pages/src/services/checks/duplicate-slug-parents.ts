import T from "../../translations/index.js";
import constants from "../../constants.js";
import type {
	ServiceFn,
	FieldSchemaType,
	FieldErrors,
	DocumentVersionType,
} from "@lucidcms/core/types";

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
				slug: FieldSchemaType;
				parentPage: FieldSchemaType;
			};
		},
	],
	undefined
> = async (context, data) => {
	try {
		const slugConditions = Object.entries(
			data.fields.slug.translations || {},
		).map(([localeCode, slug]) => ({
			localeCode,
			slug,
		}));

		if (data.fields.slug.value) {
			slugConditions.push({
				localeCode: context.config.localisation.defaultLocale,
				slug: data.fields.slug.value,
			});
		}

		const duplicates = await context.db
			.selectFrom("lucid_collection_documents")
			.leftJoin(
				"lucid_collection_document_versions",
				"lucid_collection_document_versions.document_id",
				"lucid_collection_documents.id",
			)
			.leftJoin(
				"lucid_collection_document_fields as slugFields",
				"slugFields.collection_document_version_id",
				"lucid_collection_document_versions.id",
			)
			.leftJoin(
				"lucid_collection_document_fields as parentPageFields",
				"parentPageFields.collection_document_version_id",
				"lucid_collection_document_versions.id",
			)
			.select([
				"lucid_collection_documents.id",
				"lucid_collection_documents.collection_key",
				"slugFields.text_value",
				"slugFields.locale_code",
				"parentPageFields.document_id",
			])
			.where(({ eb, and, or }) =>
				and([
					eb("slugFields.key", "=", constants.fields.slug.key),
					or(
						slugConditions.map(({ localeCode, slug }) =>
							and([
								eb("slugFields.text_value", "=", slug),
								localeCode
									? eb("slugFields.locale_code", "=", localeCode)
									: eb("slugFields.locale_code", "is", null),
							]),
						),
					),
					data.fields.parentPage.value
						? and([
								eb(
									"parentPageFields.key",
									"=",
									constants.fields.parentPage.key,
								),
								eb(
									"parentPageFields.document_id",
									"=",
									data.fields.parentPage.value,
								),
							])
						: and([
								eb(
									"parentPageFields.key",
									"=",
									constants.fields.parentPage.key,
								),
								eb("parentPageFields.document_id", "is", null),
							]),
					eb(
						"lucid_collection_document_versions.version_type",
						"=",
						data.versionType,
					),
				]),
			)
			.where("lucid_collection_documents.id", "!=", data.documentId || null)
			.where(
				"lucid_collection_documents.collection_key",
				"=",
				data.collectionKey,
			)
			.where(
				"lucid_collection_documents.is_deleted",
				"=",
				context.config.db.getDefault("boolean", "false"),
			)
			.execute();

		if (duplicates.length > 0) {
			const fieldErrors: FieldErrors[] = [];

			for (const duplicate of duplicates) {
				fieldErrors.push({
					brickId: constants.collectionFieldBrickId,
					groupId: undefined,
					key: constants.fields.slug.key,
					localeCode:
						duplicate.locale_code || context.config.localisation.defaultLocale,
					message:
						duplicate.document_id === null
							? T("duplicate_slug_field_found_message")
							: T("duplicate_slug_and_parent_page_field_found_message"),
				});
			}

			return {
				error: {
					type: "basic",
					status: 400,
					message: T("duplicate_slug_field_found_message"),
					errorResponse: {
						body: {
							fields: fieldErrors,
						},
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
