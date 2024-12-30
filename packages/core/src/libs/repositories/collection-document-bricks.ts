import constants from "../../constants/constants.js";
import boolean from "../../utils/helpers/boolean.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type {
	LucidCollectionDocumentBricks,
	Select,
	KyselyDB,
	DocumentVersionType,
} from "../db/types.js";
import type { Config } from "../../types/config.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class CollectionDocumentBricksRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// select
	selectSingle = async <
		K extends keyof Select<LucidCollectionDocumentBricks>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_collection_document_bricks">;
	}) => {
		let query = this.db
			.selectFrom("lucid_collection_document_bricks")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidCollectionDocumentBricks>, K> | undefined
		>;
	};
	selectMultipleByVersionId = async (props: {
		versionId: number;
		/** The status used to determine which version of the document custom field relations to fetch */
		documentFieldsRelationStatus: Exclude<DocumentVersionType, "revision">;
		config: Config;
	}) => {
		return this.db
			.selectFrom("lucid_collection_document_bricks")
			.select((eb) => [
				"lucid_collection_document_bricks.id",
				"lucid_collection_document_bricks.brick_type",
				"lucid_collection_document_bricks.brick_key",
				"lucid_collection_document_bricks.collection_document_version_id",
				"lucid_collection_document_bricks.brick_order",
				"lucid_collection_document_bricks.brick_open",
				props.config.db
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_collection_document_groups")
							.select([
								"lucid_collection_document_groups.group_id",
								"lucid_collection_document_groups.collection_document_version_id",
								"lucid_collection_document_groups.collection_brick_id",
								"lucid_collection_document_groups.parent_group_id",
								"lucid_collection_document_groups.repeater_key",
								"lucid_collection_document_groups.group_order",
								"lucid_collection_document_groups.group_open",
								"lucid_collection_document_groups.ref",
							])
							.whereRef(
								"lucid_collection_document_groups.collection_brick_id",
								"=",
								"lucid_collection_document_bricks.id",
							),
					)
					.as("groups"),
				props.config.db
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_collection_document_fields")
							.leftJoin("lucid_media", (join) =>
								join.onRef(
									"lucid_media.id",
									"=",
									"lucid_collection_document_fields.media_id",
								),
							)
							.leftJoin("lucid_users", (join) =>
								join.onRef(
									"lucid_users.id",
									"=",
									"lucid_collection_document_fields.user_id",
								),
							)
							.select((eb) => [
								"lucid_collection_document_fields.fields_id",
								"lucid_collection_document_fields.collection_brick_id",
								"lucid_collection_document_fields.group_id",
								"lucid_collection_document_fields.locale_code",
								"lucid_collection_document_fields.key",
								"lucid_collection_document_fields.type",
								"lucid_collection_document_fields.text_value",
								"lucid_collection_document_fields.int_value",
								"lucid_collection_document_fields.bool_value",
								"lucid_collection_document_fields.json_value",
								"lucid_collection_document_fields.media_id",
								"lucid_collection_document_fields.document_id",
								"lucid_collection_document_fields.collection_document_version_id",
								"lucid_collection_document_fields.collection_document_id",
								// User fields
								"lucid_users.id as user_id",
								"lucid_users.email as user_email",
								"lucid_users.first_name as user_first_name",
								"lucid_users.last_name as user_last_name",
								"lucid_users.email as user_email",
								"lucid_users.username as user_username",
								// Media fields
								"lucid_media.key as media_key",
								"lucid_media.mime_type as media_mime_type",
								"lucid_media.file_extension as media_file_extension",
								"lucid_media.file_size as media_file_size",
								"lucid_media.width as media_width",
								"lucid_media.height as media_height",
								"lucid_media.type as media_type",
								"lucid_media.blur_hash as media_blur_hash",
								"lucid_media.average_colour as media_average_colour",
								"lucid_media.is_dark as media_is_dark",
								"lucid_media.is_light as media_is_light",
								props.config.db
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_translations")
											.select([
												"lucid_translations.value",
												"lucid_translations.locale_code",
											])
											.where("lucid_translations.value", "is not", null)
											.whereRef(
												"lucid_translations.translation_key_id",
												"=",
												"lucid_media.title_translation_key_id",
											),
									)
									.as("media_title_translations"),
								props.config.db
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_translations")
											.select([
												"lucid_translations.value",
												"lucid_translations.locale_code",
											])
											.where("lucid_translations.value", "is not", null)
											.whereRef(
												"lucid_translations.translation_key_id",
												"=",
												"lucid_media.alt_translation_key_id",
											),
									)
									.as("media_alt_translations"),
								props.config.db
									.jsonArrayFrom(
										eb
											.selectFrom(
												"lucid_collection_document_fields as doc_fields",
											)
											.leftJoin(
												"lucid_collection_document_bricks as doc_bricks",
												(join) =>
													join.onRef(
														"doc_bricks.id",
														"=",
														"doc_fields.collection_brick_id",
													),
											)
											.leftJoin(
												"lucid_collection_document_versions as inner_versions",
												(join) =>
													join.onRef(
														"inner_versions.id",
														"=",
														"doc_fields.collection_document_version_id",
													),
											)
											.select([
												"doc_fields.fields_id",
												"doc_fields.collection_brick_id",
												"doc_fields.group_id",
												"doc_fields.locale_code",
												"doc_fields.key",
												"doc_fields.type",
												"doc_fields.text_value",
												"doc_fields.int_value",
												"doc_fields.bool_value",
												"doc_fields.json_value",
												"doc_fields.media_id",
												"doc_fields.document_id",
												"doc_fields.collection_document_version_id",
												"doc_fields.collection_document_id",
											])
											.where(
												"doc_bricks.brick_type",
												"=",
												constants.brickTypes.collectionFields,
											)
											.whereRef(
												"doc_fields.collection_document_id",
												"=",
												"lucid_collection_document_fields.document_id",
											)
											.where(
												"inner_versions.version_type",
												"=",
												props.documentFieldsRelationStatus,
											),
									)
									.as("document_fields"),
								props.config.db
									.jsonArrayFrom(
										eb
											.selectFrom(
												"lucid_collection_document_groups as doc_groups",
											)
											.leftJoin(
												"lucid_collection_document_bricks as doc_bricks",
												(join) =>
													join.onRef(
														"doc_bricks.id",
														"=",
														"doc_groups.collection_brick_id",
													),
											)
											.leftJoin(
												"lucid_collection_document_versions as inner_versions",
												(join) =>
													join.onRef(
														"inner_versions.id",
														"=",
														"doc_groups.collection_document_version_id",
													),
											)
											.select([
												"doc_groups.group_id",
												"doc_groups.collection_document_version_id",
												"doc_groups.collection_document_id",
												"doc_groups.collection_brick_id",
												"doc_groups.parent_group_id",
												"doc_groups.repeater_key",
												"doc_groups.group_order",
												"doc_groups.group_open",
												"doc_groups.ref",
											])
											.where(
												"doc_bricks.brick_type",
												"=",
												constants.brickTypes.collectionFields,
											)
											.whereRef(
												"doc_groups.collection_document_id",
												"=",
												"lucid_collection_document_fields.document_id",
											)
											.where(
												"inner_versions.version_type",
												"=",
												props.documentFieldsRelationStatus,
											),
									)
									.as("document_groups"),
							])
							.whereRef(
								"lucid_collection_document_fields.collection_brick_id",
								"=",
								"lucid_collection_document_bricks.id",
							),
					)
					.as("fields"),
			])
			.orderBy("lucid_collection_document_bricks.brick_order", "asc")
			.where(
				"lucid_collection_document_bricks.collection_document_version_id",
				"=",
				props.versionId,
			)
			.execute();
	};
	// ----------------------------------------
	// create
	createMultiple = async (props: {
		items: Array<{
			id?: number;
			brickType: BrickSchema["type"];
			brickKey?: string;
			brickOrder?: number;
			brickOpen?: boolean;
			collectionDocumentVersionId: number;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_collection_document_bricks")
			.values(
				props.items.map((b) => {
					return {
						id: b.id,
						brick_type: b.brickType,
						brick_key: b.brickKey,
						brick_order: b.brickOrder,
						brick_open: boolean.insertFormat(b.brickOpen, this.dbAdapter),
						collection_document_version_id: b.collectionDocumentVersionId,
					};
				}),
			)
			.returning(["id", "brick_order", "brick_key", "brick_type"])
			.execute();
	};
	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_collection_document_bricks">;
	}) => {
		let query = this.db.deleteFrom("lucid_collection_document_bricks");

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
