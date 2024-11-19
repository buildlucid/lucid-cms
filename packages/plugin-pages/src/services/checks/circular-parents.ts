import T from "../../translations/index.js";
import constants from "../../constants.js";
import type {
	ServiceFn,
	FieldSchemaType,
	DocumentVersionType,
} from "@lucidcms/core/types";

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
				parentPage: FieldSchemaType;
			};
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

		const result = await context.db
			.with("ancestors", (db) =>
				db
					.selectFrom("lucid_collection_document_fields as fields")
					.innerJoin(
						"lucid_collection_document_versions as versions",
						"versions.id",
						"fields.collection_document_version_id",
					)
					.select([
						"versions.document_id as current_id",
						"fields.document_id as parent_id",
					])
					.where("fields.key", "=", "parentPage")
					.where("versions.version_type", "=", data.versionType)
					.where("versions.document_id", "=", data.fields.parentPage.value)
					.unionAll(
						db
							.selectFrom("lucid_collection_document_fields as fields")
							.innerJoin(
								"lucid_collection_document_versions as versions",
								"versions.id",
								"fields.collection_document_version_id",
							)
							.innerJoin(
								// @ts-expect-error
								"ancestors",
								"ancestors.parent_id",
								"versions.document_id",
							)
							// @ts-expect-error
							.select([
								"versions.document_id as current_id",
								"fields.document_id as parent_id",
							])
							.where("fields.key", "=", "parentPage")
							.where("versions.version_type", "=", data.versionType),
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
					errorResponse: {
						body: {
							fields: [
								{
									brickId: constants.collectionFieldBrickId,
									groupId: undefined,
									key: constants.fields.parentPage.key,
									localeCode: data.defaultLocale, //* parentPage doesnt use translations so always use default locale
									message: T("circular_parents_error_message"),
								},
							],
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
				message: T("an_unknown_error_occurred_checking_for_circular_parents"),
			},
			data: undefined,
		};
	}
};

export default checkCircularParents;
