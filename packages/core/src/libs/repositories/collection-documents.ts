import { sql } from "kysely";
import constants from "../../constants/constants.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type z from "zod";
import type {
	LucidCollectionDocuments,
	Select,
	KyselyDB,
	DocumentVersionType,
} from "../db/types.js";
import type { Config } from "../../types/config.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type collectionDocumentsSchema from "../../schemas/collection-documents.js";
import type { DocumentFieldFilters } from "../../types.js";
import type { QueryParamFilters } from "../../types/query-params.js";
import type DatabaseAdapter from "../db/adapter.js";
import boolean from "../../utils/helpers/boolean.js";

export default class CollectionDocumentsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// select
	selectSingle = async <
		K extends keyof Select<LucidCollectionDocuments>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_collection_documents">;
	}) => {
		let query = this.db
			.selectFrom("lucid_collection_documents")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidCollectionDocuments>, K> | undefined
		>;
	};
	selectSingleById = async (props: {
		id: number;
		collectionKey: string;
		config: Config;
		status?: DocumentVersionType;
		versionId?: number;
	}) => {
		return this.db
			.selectFrom("lucid_collection_documents")
			.select([
				"lucid_collection_documents.id",
				"lucid_collection_documents.collection_key",
				"lucid_collection_documents.created_by",
				"lucid_collection_documents.created_at",
				"lucid_collection_documents.updated_at",
				"lucid_collection_documents.updated_by",
				// Versions
				(eb) =>
					props.config.db
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_collection_document_versions")
								.select([
									"lucid_collection_document_versions.id",
									"lucid_collection_document_versions.version_type",
									"lucid_collection_document_versions.promoted_from",
									"lucid_collection_document_versions.created_at",
									"lucid_collection_document_versions.created_by",
								])
								.whereRef(
									"lucid_collection_document_versions.document_id",
									"=",
									"lucid_collection_documents.id",
								)
								.where((eb) =>
									eb.or([
										eb(
											"lucid_collection_document_versions.version_type",
											"=",
											"draft",
										),
										eb(
											"lucid_collection_document_versions.version_type",
											"=",
											"published",
										),
									]),
								),
						)
						.as("versions"),
			])
			.leftJoin(
				"lucid_collection_document_versions as published_version",
				"published_version.document_id",
				"lucid_collection_documents.id",
			)
			.$if(props.status !== undefined, (eb) =>
				eb
					.leftJoin(
						"lucid_collection_document_versions",
						"lucid_collection_document_versions.document_id",
						"lucid_collection_documents.id",
					)
					.select([
						"lucid_collection_document_versions.id as version_id",
						"lucid_collection_document_versions.version_type as version_type",
						"lucid_collection_document_versions.promoted_from as version_promoted_from",
						"lucid_collection_document_versions.created_at as version_created_at",
						"lucid_collection_document_versions.created_by as version_created_by",
					])
					.where(
						"lucid_collection_document_versions.version_type",
						"=",
						props.status as DocumentVersionType,
					),
			)
			.$if(props.versionId !== undefined, (eb) =>
				eb
					.leftJoin(
						"lucid_collection_document_versions",
						"lucid_collection_document_versions.document_id",
						"lucid_collection_documents.id",
					)
					.select([
						"lucid_collection_document_versions.id as version_id",
						"lucid_collection_document_versions.version_type as version_type",
						"lucid_collection_document_versions.promoted_from as version_promoted_from",
						"lucid_collection_document_versions.created_at as version_created_at",
						"lucid_collection_document_versions.created_by as version_created_by",
					])
					.where(
						"lucid_collection_document_versions.id",
						"=",
						props.versionId as number,
					),
			)
			.leftJoin(
				"lucid_users as cb_user",
				"cb_user.id",
				"lucid_collection_documents.created_by",
			)
			.leftJoin(
				"lucid_users as ub_user",
				"cb_user.id",
				"lucid_collection_documents.updated_by",
			)
			.select([
				// created by
				"cb_user.id as cb_user_id",
				"cb_user.email as cb_user_email",
				"cb_user.first_name as cb_user_first_name",
				"cb_user.last_name as cb_user_last_name",
				"cb_user.username as cb_user_username",
				// updated by
				"ub_user.id as ub_user_id",
				"ub_user.email as ub_user_email",
				"ub_user.first_name as ub_user_first_name",
				"ub_user.last_name as ub_user_last_name",
				"ub_user.username as ub_user_username",
			])
			.where("lucid_collection_documents.id", "=", props.id)
			.where(
				"lucid_collection_documents.is_deleted",
				"=",
				this.dbAdapter.config.defaults.boolean.false,
			)
			.where(
				"lucid_collection_documents.collection_key",
				"=",
				props.collectionKey,
			)
			.executeTakeFirst();
	};
	selectSingleFiltered = async (props: {
		documentFilters: QueryParamFilters;
		documentFieldFilters: DocumentFieldFilters[];
		collection: CollectionBuilder;
		includeGroups: boolean;
		includeAllFields?: boolean;
		config: Config;
		status: Exclude<DocumentVersionType, "revision">;
		/** The status used to determine which version of the document custom field relations to fetch */
		documentFieldsRelationStatus: Exclude<DocumentVersionType, "revision">;
	}) => {
		let pagesQuery = this.db
			.selectFrom("lucid_collection_documents")
			.select([
				"lucid_collection_documents.id",
				"lucid_collection_documents.collection_key",
				"lucid_collection_documents.created_by",
				"lucid_collection_documents.created_at",
				"lucid_collection_documents.updated_at",
				"lucid_collection_documents.updated_by",
				// Versions
				(eb) =>
					props.config.db
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_collection_document_versions")
								.select([
									"lucid_collection_document_versions.id",
									"lucid_collection_document_versions.version_type",
									"lucid_collection_document_versions.promoted_from",
									"lucid_collection_document_versions.created_at",
									"lucid_collection_document_versions.created_by",
								])
								.whereRef(
									"lucid_collection_document_versions.document_id",
									"=",
									"lucid_collection_documents.id",
								)
								.where((eb) =>
									eb.or([
										eb(
											"lucid_collection_document_versions.version_type",
											"=",
											"draft",
										),
										eb(
											"lucid_collection_document_versions.version_type",
											"=",
											"published",
										),
									]),
								),
						)
						.as("versions"),
			])
			.leftJoin(
				"lucid_users as cb_user",
				"cb_user.id",
				"lucid_collection_documents.created_by",
			)
			.leftJoin(
				"lucid_users as ub_user",
				"cb_user.id",
				"lucid_collection_documents.updated_by",
			)
			.leftJoin(
				"lucid_collection_document_versions",
				"lucid_collection_document_versions.document_id",
				"lucid_collection_documents.id",
			)
			.select([
				"cb_user.id as cb_user_id",
				"cb_user.email as cb_user_email",
				"cb_user.first_name as cb_user_first_name",
				"cb_user.last_name as cb_user_last_name",
				"cb_user.username as cb_user_username",
				"ub_user.id as ub_user_id",
				"ub_user.email as ub_user_email",
				"ub_user.first_name as ub_user_first_name",
				"ub_user.last_name as ub_user_last_name",
				"ub_user.username as ub_user_username",
				// Versions
				"lucid_collection_document_versions.id as version_id",
				"lucid_collection_document_versions.version_type as version_type",
				"lucid_collection_document_versions.promoted_from as version_promoted_from",
				"lucid_collection_document_versions.created_at as version_created_at",
				"lucid_collection_document_versions.created_by as version_created_by",
			])
			.where(
				"lucid_collection_documents.is_deleted",
				"=",
				this.dbAdapter.config.defaults.boolean.false,
			)
			.where(
				"lucid_collection_documents.collection_key",
				"=",
				props.collection.key,
			)
			.where(
				"lucid_collection_document_versions.version_type",
				"=",
				props.status,
			)
			.groupBy([
				"lucid_collection_documents.id",
				"ub_user.id",
				"cb_user.id",
				"lucid_collection_document_versions.id",
			]);

		const includeFieldKeys = props.collection.queryIncludeFields(
			props.includeAllFields,
		);

		if (includeFieldKeys.length > 0) {
			if (props.includeGroups) {
				pagesQuery = pagesQuery.select((eb) => [
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
									"lucid_collection_document_groups.collection_document_version_id",
									"=",
									"lucid_collection_document_versions.id",
								),
						)
						.as("groups"),
				]);
			}

			pagesQuery = pagesQuery
				.select((eb) => [
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
									"lucid_collection_document_fields.text_value",
									"lucid_collection_document_fields.int_value",
									"lucid_collection_document_fields.bool_value",
									"lucid_collection_document_fields.locale_code",
									"lucid_collection_document_fields.media_id",
									"lucid_collection_document_fields.user_id",
									"lucid_collection_document_fields.document_id",
									"lucid_collection_document_fields.type",
									"lucid_collection_document_fields.key",
									"lucid_collection_document_fields.collection_brick_id",
									"lucid_collection_document_fields.collection_document_version_id",
									"lucid_collection_document_fields.collection_document_id",
									"lucid_collection_document_fields.group_id",
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
															"inner_versions.document_id",
															"=",
															"doc_fields.collection_document_id",
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
													"lucid_collection_document_fields.collection_document_id",
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
															"inner_versions.document_id",
															"=",
															"doc_groups.collection_document_id",
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
													"lucid_collection_document_fields.collection_document_id",
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
									"lucid_collection_document_fields.collection_document_version_id",
									"=",
									"lucid_collection_document_versions.id",
								)
								.where(
									"lucid_collection_document_fields.key",
									"in",
									includeFieldKeys,
								),
						)
						.as("fields"),
				])
				.leftJoin("lucid_collection_document_fields", (join) =>
					join.onRef(
						"lucid_collection_document_fields.collection_document_version_id",
						"=",
						"lucid_collection_document_versions.id",
					),
				);
		}

		const { main } = queryBuilder.main(
			{
				main: pagesQuery,
			},
			{
				queryParams: {
					filter: props.documentFilters,
				},
				documentFieldFilters: props.documentFieldFilters,
				meta: {
					tableKeys: {
						filters: {
							documentId: "lucid_collection_documents.id",
							documentCollectionKey:
								"lucid_collection_documents.collection_key",
							documentCreatedBy: "lucid_collection_documents.created_by",
							documentUpdatedBy: "lucid_collection_documents.updated_by",
							documentCreatedAt: "lucid_collection_documents.created_at",
							documentUpdatedAt: "lucid_collection_documents.updated_at",
						},
					},
				},
			},
		);

		return main.executeTakeFirst();
	};
	selectMultiple = async <
		K extends keyof Select<LucidCollectionDocuments>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_collection_documents">;
	}) => {
		let query = this.db
			.selectFrom("lucid_collection_documents")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.execute() as Promise<
			Array<Pick<Select<LucidCollectionDocuments>, K>>
		>;
	};
	selectMultipleFiltered = async (props: {
		status: DocumentVersionType;
		/** The status used to determine which version of the document custom field relations to fetch */
		documentFieldsRelationStatus: Exclude<DocumentVersionType, "revision">;
		documentFilters: QueryParamFilters;
		documentFieldFilters: DocumentFieldFilters[];
		query: z.infer<typeof collectionDocumentsSchema.getMultiple.query>;
		includeAllFields?: boolean;
		includeGroups?: boolean;
		collection: CollectionBuilder;
		config: Config;
	}) => {
		let pagesQuery = this.db
			.selectFrom("lucid_collection_documents")
			.leftJoin(
				"lucid_collection_document_versions",
				"lucid_collection_document_versions.document_id",
				"lucid_collection_documents.id",
			)
			.select([
				"lucid_collection_documents.id",
				"lucid_collection_documents.collection_key",
				"lucid_collection_documents.created_by",
				"lucid_collection_documents.created_at",
				"lucid_collection_documents.updated_at",
				"lucid_collection_documents.updated_by",
				// Versions
				"lucid_collection_document_versions.id as version_id",
				"lucid_collection_document_versions.version_type as version_type",
				"lucid_collection_document_versions.promoted_from as version_promoted_from",
				"lucid_collection_document_versions.created_at as version_created_at",
				"lucid_collection_document_versions.created_by as version_created_by",
				// Versions
				(eb) =>
					props.config.db
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_collection_document_versions")
								.select([
									"lucid_collection_document_versions.id",
									"lucid_collection_document_versions.version_type",
									"lucid_collection_document_versions.promoted_from",
									"lucid_collection_document_versions.created_at",
									"lucid_collection_document_versions.created_by",
								])
								.whereRef(
									"lucid_collection_document_versions.document_id",
									"=",
									"lucid_collection_documents.id",
								)
								.where((eb) =>
									eb.or([
										eb(
											"lucid_collection_document_versions.version_type",
											"=",
											"draft",
										),
										eb(
											"lucid_collection_document_versions.version_type",
											"=",
											"published",
										),
									]),
								),
						)
						.as("versions"),
			])
			.leftJoin(
				"lucid_users",
				"lucid_users.id",
				"lucid_collection_documents.created_by",
			)
			.where(
				"lucid_collection_documents.is_deleted",
				"=",
				this.dbAdapter.config.defaults.boolean.false,
			)
			.where(
				"lucid_collection_documents.collection_key",
				"=",
				props.collection.key,
			)
			.where(
				"lucid_collection_document_versions.version_type",
				"=",
				props.status,
			)
			.groupBy([
				"lucid_collection_documents.id",
				"lucid_users.id",
				"lucid_collection_document_versions.id",
			]);

		let pagesCountQuery = this.db
			.selectFrom("lucid_collection_documents")
			.leftJoin(
				"lucid_collection_document_versions",
				"lucid_collection_document_versions.document_id",
				"lucid_collection_documents.id",
			)
			.select(sql`count(distinct lucid_collection_documents.id)`.as("count"))
			.leftJoin(
				"lucid_users",
				"lucid_users.id",
				"lucid_collection_documents.created_by",
			)
			.where(
				"lucid_collection_documents.collection_key",
				"=",
				props.collection.key,
			)
			.where(
				"lucid_collection_documents.is_deleted",
				"=",
				this.dbAdapter.config.defaults.boolean.false,
			)
			.where(
				"lucid_collection_document_versions.version_type",
				"=",
				props.status,
			);

		const includeFieldKeys = props.collection.queryIncludeFields(
			props.includeAllFields,
		);

		if (includeFieldKeys.length > 0) {
			if (props.includeGroups) {
				pagesQuery = pagesQuery.select((eb) => [
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
									"lucid_collection_document_groups.collection_document_version_id",
									"=",
									"lucid_collection_document_versions.id",
								),
						)
						.as("groups"),
				]);
			}

			pagesQuery = pagesQuery
				.select((eb) => [
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
									"lucid_collection_document_fields.text_value",
									"lucid_collection_document_fields.int_value",
									"lucid_collection_document_fields.bool_value",
									"lucid_collection_document_fields.locale_code",
									"lucid_collection_document_fields.media_id",
									"lucid_collection_document_fields.user_id",
									"lucid_collection_document_fields.document_id",
									"lucid_collection_document_fields.type",
									"lucid_collection_document_fields.key",
									"lucid_collection_document_fields.collection_brick_id",
									"lucid_collection_document_fields.collection_document_version_id",
									"lucid_collection_document_fields.collection_document_id",
									"lucid_collection_document_fields.group_id",
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
									"lucid_collection_document_fields.collection_document_version_id",
									"=",
									"lucid_collection_document_versions.id",
								)
								.where(
									"lucid_collection_document_fields.key",
									"in",
									includeFieldKeys,
								),
						)
						.as("fields"),
				])
				.leftJoin("lucid_collection_document_fields", (join) =>
					join.onRef(
						"lucid_collection_document_fields.collection_document_version_id",
						"=",
						"lucid_collection_document_versions.id",
					),
				);

			if (props.documentFieldFilters.length > 0) {
				pagesCountQuery = pagesCountQuery.leftJoin(
					"lucid_collection_document_fields",
					(join) =>
						join.onRef(
							"lucid_collection_document_fields.collection_document_version_id",
							"=",
							"lucid_collection_document_versions.id",
						),
				);
			}
		}

		const { main, count } = queryBuilder.main(
			{
				main: pagesQuery,
				count: pagesCountQuery,
			},
			{
				queryParams: {
					filter: props.documentFilters,
					sort: props.query.sort,
					page: props.query.page,
					perPage: props.query.perPage,
				},
				documentFieldFilters: props.documentFieldFilters,
				meta: {
					tableKeys: {
						filters: {
							documentId: "lucid_collection_documents.id",
							documentCollectionKey:
								"lucid_collection_documents.collection_key",
							documentCreatedBy: "lucid_collection_documents.created_by",
							documentUpdatedBy: "lucid_collection_documents.updated_by",
							documentCreatedAt: "lucid_collection_documents.created_at",
							documentUpdatedAt: "lucid_collection_documents.updated_at",
						},
						sorts: {
							createdAt: "created_at",
							updatedAt: "updated_at",
						},
					},
				},
			},
		);

		return await Promise.all([
			main.execute(),
			count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
		]);
	};
	// ----------------------------------------
	// upsert
	upsertSingle = async (props: {
		id?: number;
		collectionKey: string;
		createdBy: number;
		updatedBy: number;
		isDeleted: boolean;
		updatedAt: string;
	}) => {
		return this.db
			.insertInto("lucid_collection_documents")
			.values({
				id: props.id,
				collection_key: props.collectionKey,
				created_by: props.createdBy,
				updated_by: props.updatedBy,
				is_deleted: boolean.insertFormat(props.isDeleted, this.dbAdapter),
			})
			.onConflict((oc) =>
				oc.column("id").doUpdateSet({
					created_by: props.createdBy,
					updated_by: props.updatedBy,
					is_deleted: boolean.insertFormat(props.isDeleted, this.dbAdapter),
					updated_at: props.updatedAt,
				}),
			)
			.returning("id")
			.executeTakeFirst();
	};
	// ----------------------------------------
	// update
	updateSingle = async (props: {
		where: QueryBuilderWhere<"lucid_collection_documents">;
		data: {
			isDeleted?: boolean;
			isDeletedAt?: string;
			deletedBy?: number;
		};
	}) => {
		let query = this.db
			.updateTable("lucid_collection_documents")
			.set({
				is_deleted: boolean.insertFormat(props.data.isDeleted, this.dbAdapter),
				is_deleted_at: props.data.isDeletedAt,
				deleted_by: props.data.deletedBy,
			})
			.returning(["id"]);

		query = queryBuilder.update(query, props.where);

		return query.executeTakeFirst();
	};
	updateMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_collection_documents">;
		data: {
			isDeleted?: boolean;
			isDeletedAt?: string;
			deletedBy?: number;
		};
	}) => {
		let query = this.db
			.updateTable("lucid_collection_documents")
			.set({
				is_deleted: boolean.insertFormat(props.data.isDeleted, this.dbAdapter),
				is_deleted_at: props.data.isDeletedAt,
				deleted_by: props.data.deletedBy,
			})
			.returning(["id"]);

		query = queryBuilder.update(query, props.where);

		return query.execute();
	};
	// ----------------------------------------
	// delete
	deleteSingle = async (props: {
		where: QueryBuilderWhere<"lucid_collection_documents">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_collection_documents")
			.returning(["id"]);

		query = queryBuilder.delete(query, props.where);

		return query.executeTakeFirst();
	};
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_collection_documents">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_collection_documents")
			.returning(["id"]);

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
