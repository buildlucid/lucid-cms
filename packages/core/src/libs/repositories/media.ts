import { sql } from "kysely";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { mediaTable } from "../db/tables/media.js";
import { activeMediaCropSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class MediaRepository extends StaticRepository<"lucid_media"> {
	constructor(db: LucidDatabase) {
		super(db, mediaTable);
	}

	// ----------------------------------------
	// queries
	async sumFileSize() {
		const query = this.db
			.selectFrom("lucid_media")
			.select(sql<string | number>`COALESCE(SUM(file_size), 0)`.as("total"));

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					{ total: string | number | null } | undefined
				>,
			{
				method: "sumFileSize",
			},
		);
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: Number(exec.response.data?.total ?? 0),
		};
	}

	/** Resolves a requested source or crop key to its current active presentation. */
	async selectSingleActivePresentationByKey(props: { key: string }) {
		const query = this.db
			.selectFrom("lucid_media as requested")
			.innerJoin("lucid_media as source", (join) =>
				join.on((eb) =>
					eb.or([
						eb.and([
							eb("requested.relation_type", "=", "crop"),
							eb("source.id", "=", eb.ref("requested.parent_media_id")),
						]),
						eb.and([
							eb.or([
								eb("requested.relation_type", "is", null),
								eb("requested.relation_type", "=", "poster"),
							]),
							eb("source.id", "=", eb.ref("requested.id")),
						]),
					]),
				),
			)
			.leftJoin("lucid_media as active_crop", (join) =>
				join
					.onRef("active_crop.parent_media_id", "=", "source.id")
					.on("active_crop.relation_type", "=", "crop")
					.on(
						"active_crop.is_deleted",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					),
			)
			.select([
				"source.type as source_type",
				"source.key as source_key",
				"source.status as source_status",
				"source.storage_adapter_key as source_storage_adapter_key",
				"source.storage_adapter_reference as source_storage_adapter_reference",
				"source.storage_adapter_data as source_storage_adapter_data",
				"source.public as source_public",
				"source.mime_type as source_mime_type",
				"source.file_name as source_file_name",
				"source.file_extension as source_file_extension",
				"source.width as source_width",
				"source.height as source_height",
				"source.focal_x as source_focal_x",
				"source.focal_y as source_focal_y",
				"active_crop.id as active_crop_id",
				"active_crop.type as active_crop_type",
				"active_crop.key as active_crop_key",
				"active_crop.status as active_crop_status",
				"active_crop.storage_adapter_key as active_crop_storage_adapter_key",
				"active_crop.storage_adapter_reference as active_crop_storage_adapter_reference",
				"active_crop.storage_adapter_data as active_crop_storage_adapter_data",
				"active_crop.public as active_crop_public",
				"active_crop.mime_type as active_crop_mime_type",
				"active_crop.file_name as active_crop_file_name",
				"active_crop.file_extension as active_crop_file_extension",
				"active_crop.width as active_crop_width",
				"active_crop.height as active_crop_height",
				"active_crop.focal_x as active_crop_focal_x",
				"active_crop.focal_y as active_crop_focal_y",
			])
			.where("requested.key", "=", props.key)
			.limit(1);

		const exec = await this.executeQuery(
			async () => {
				const result = await query.executeTakeFirst();
				if (!result) return undefined;

				return {
					type: result.active_crop_type ?? result.source_type,
					key: result.active_crop_key ?? result.source_key,
					status: result.active_crop_status ?? result.source_status,
					storage_adapter_key:
						result.active_crop_storage_adapter_key ??
						result.source_storage_adapter_key,
					storage_adapter_reference:
						result.active_crop_id !== null
							? result.active_crop_storage_adapter_reference
							: result.source_storage_adapter_reference,
					storage_adapter_data:
						result.active_crop_id !== null
							? result.active_crop_storage_adapter_data
							: result.source_storage_adapter_data,
					public: result.active_crop_public ?? result.source_public,
					mime_type: result.active_crop_mime_type ?? result.source_mime_type,
					file_name:
						result.active_crop_id !== null
							? result.active_crop_file_name
							: result.source_file_name,
					file_extension:
						result.active_crop_file_extension ?? result.source_file_extension,
					width: result.active_crop_width ?? result.source_width,
					height: result.active_crop_height ?? result.source_height,
					focal_x: result.active_crop_focal_x ?? result.source_focal_x,
					focal_y: result.active_crop_focal_y ?? result.source_focal_y,
				};
			},
			{
				method: "selectSingleActivePresentationByKey",
			},
		);
		if (exec.response.error) return exec.response;

		return exec.response;
	}

	async selectSingleById<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				includeOwned?: boolean;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_media")
			.select((eb) => [
				"id",
				"key",
				"status",
				"storage_adapter_key",
				"storage_adapter_reference",
				"storage_adapter_data",
				"folder_id",
				"parent_media_id",
				"relation_type",
				"e_tag",
				"origin",
				"type",
				"mime_type",
				"file_extension",
				"file_name",
				"file_size",
				"width",
				"height",
				"focal_x",
				"focal_y",
				"crop_x",
				"crop_y",
				"crop_width",
				"crop_height",
				"crop_rotation",
				"crop_skew_x",
				"crop_skew_y",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_color",
				"base64",
				"is_dark",
				"is_light",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"public",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as poster")
							.select([
								"poster.id",
								"poster.key",
								"poster.status",
								"poster.storage_adapter_key",
								"poster.storage_adapter_reference",
								"poster.storage_adapter_data",
								"poster.public",
								"poster.origin",
								"poster.type",
								"poster.mime_type",
								"poster.file_extension",
								"poster.file_name",
								"poster.file_size",
								"poster.width",
								"poster.height",
								"poster.focal_x",
								"poster.focal_y",
								"poster.crop_x",
								"poster.crop_y",
								"poster.crop_width",
								"poster.crop_height",
								"poster.crop_rotation",
								"poster.crop_skew_x",
								"poster.crop_skew_y",
								"poster.blur_hash",
								"poster.average_color",
								"poster.base64",
								"poster.is_dark",
								"poster.is_light",
								this.database.fn
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_media_translations")
											.select([
												"lucid_media_translations.title",
												"lucid_media_translations.alt",
												"lucid_media_translations.description",
												"lucid_media_translations.summary",
												"lucid_media_translations.locale_code",
											])
											.whereRef(
												"lucid_media_translations.media_id",
												"=",
												sql.ref("poster.id"),
											),
									)
									.as("translations"),
								this.database.fn
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_media as poster_crop")
											.select([
												"poster_crop.id",
												"poster_crop.key",
												"poster_crop.status",
												"poster_crop.storage_adapter_key",
												"poster_crop.storage_adapter_reference",
												"poster_crop.storage_adapter_data",
												"poster_crop.public",
												"poster_crop.origin",
												"poster_crop.type",
												"poster_crop.mime_type",
												"poster_crop.file_extension",
												"poster_crop.file_name",
												"poster_crop.file_size",
												"poster_crop.width",
												"poster_crop.height",
												"poster_crop.focal_x",
												"poster_crop.focal_y",
												"poster_crop.crop_x",
												"poster_crop.crop_y",
												"poster_crop.crop_width",
												"poster_crop.crop_height",
												"poster_crop.crop_rotation",
												"poster_crop.crop_skew_x",
												"poster_crop.crop_skew_y",
												"poster_crop.blur_hash",
												"poster_crop.average_color",
												"poster_crop.base64",
												"poster_crop.is_dark",
												"poster_crop.is_light",
											])
											.where(
												"poster_crop.parent_media_id",
												"=",
												sql.ref<number>("poster.id"),
											)
											.where("poster_crop.relation_type", "=", "crop")
											.where(
												"poster_crop.is_deleted",
												"=",
												this.dbAdapter.getDefault("boolean", "false"),
											),
									)
									.as("crop"),
							])
							.whereRef("poster.parent_media_id", "=", "lucid_media.id")
							.where("poster.relation_type", "=", "poster")
							.where(
								"poster.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("poster"),
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as crop")
							.select([
								"crop.id",
								"crop.key",
								"crop.status",
								"crop.storage_adapter_key",
								"crop.storage_adapter_reference",
								"crop.storage_adapter_data",
								"crop.public",
								"crop.origin",
								"crop.type",
								"crop.mime_type",
								"crop.file_extension",
								"crop.file_name",
								"crop.file_size",
								"crop.width",
								"crop.height",
								"crop.focal_x",
								"crop.focal_y",
								"crop.crop_x",
								"crop.crop_y",
								"crop.crop_width",
								"crop.crop_height",
								"crop.crop_rotation",
								"crop.crop_skew_x",
								"crop.crop_skew_y",
								"crop.blur_hash",
								"crop.average_color",
								"crop.base64",
								"crop.is_dark",
								"crop.is_light",
							])
							.whereRef("crop.parent_media_id", "=", "lucid_media.id")
							.where("crop.relation_type", "=", "crop")
							.where(
								"crop.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("crop"),
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media_translations")
							.select([
								"lucid_media_translations.title",
								"lucid_media_translations.alt",
								"lucid_media_translations.description",
								"lucid_media_translations.summary",
								"lucid_media_translations.locale_code",
							])
							.whereRef(
								"lucid_media_translations.media_id",
								"=",
								"lucid_media.id",
							),
					)
					.as("translations"),
			])
			.where("id", "=", props.id)
			.$if(props.includeOwned !== true, (qb) =>
				qb.where("parent_media_id", "is", null),
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleById",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"key",
				"status",
				"storage_adapter_key",
				"storage_adapter_reference",
				"storage_adapter_data",
				"folder_id",
				"parent_media_id",
				"relation_type",
				"e_tag",
				"origin",
				"type",
				"mime_type",
				"file_extension",
				"file_name",
				"file_size",
				"width",
				"height",
				"focal_x",
				"focal_y",
				"crop_x",
				"crop_y",
				"crop_width",
				"crop_height",
				"crop_rotation",
				"crop_skew_x",
				"crop_skew_y",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_color",
				"base64",
				"is_dark",
				"is_light",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"translations",
				"public",
				"poster",
				"crop",
			],
		});
	}
	/** Fetches top-level media and their active owned derivatives in one query. */
	async selectMultipleByIds<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				ids: number[];
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_media")
			.select((eb) => [
				"id",
				"key",
				"status",
				"storage_adapter_key",
				"storage_adapter_reference",
				"storage_adapter_data",
				"folder_id",
				"parent_media_id",
				"relation_type",
				"e_tag",
				"origin",
				"type",
				"mime_type",
				"file_extension",
				"file_name",
				"file_size",
				"width",
				"height",
				"focal_x",
				"focal_y",
				"crop_x",
				"crop_y",
				"crop_width",
				"crop_height",
				"crop_rotation",
				"crop_skew_x",
				"crop_skew_y",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_color",
				"base64",
				"is_dark",
				"is_light",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"public",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as poster")
							.select([
								"poster.id",
								"poster.key",
								"poster.status",
								"poster.storage_adapter_key",
								"poster.storage_adapter_reference",
								"poster.storage_adapter_data",
								"poster.public",
								"poster.origin",
								"poster.type",
								"poster.mime_type",
								"poster.file_extension",
								"poster.file_name",
								"poster.file_size",
								"poster.width",
								"poster.height",
								"poster.focal_x",
								"poster.focal_y",
								"poster.crop_x",
								"poster.crop_y",
								"poster.crop_width",
								"poster.crop_height",
								"poster.crop_rotation",
								"poster.crop_skew_x",
								"poster.crop_skew_y",
								"poster.blur_hash",
								"poster.average_color",
								"poster.base64",
								"poster.is_dark",
								"poster.is_light",
								this.database.fn
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_media_translations")
											.select([
												"lucid_media_translations.title",
												"lucid_media_translations.alt",
												"lucid_media_translations.description",
												"lucid_media_translations.summary",
												"lucid_media_translations.locale_code",
											])
											.whereRef(
												"lucid_media_translations.media_id",
												"=",
												sql.ref("poster.id"),
											),
									)
									.as("translations"),
								this.database.fn
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_media as poster_crop")
											.select([
												"poster_crop.id",
												"poster_crop.key",
												"poster_crop.status",
												"poster_crop.storage_adapter_key",
												"poster_crop.storage_adapter_reference",
												"poster_crop.storage_adapter_data",
												"poster_crop.public",
												"poster_crop.origin",
												"poster_crop.type",
												"poster_crop.mime_type",
												"poster_crop.file_extension",
												"poster_crop.file_name",
												"poster_crop.file_size",
												"poster_crop.width",
												"poster_crop.height",
												"poster_crop.focal_x",
												"poster_crop.focal_y",
												"poster_crop.crop_x",
												"poster_crop.crop_y",
												"poster_crop.crop_width",
												"poster_crop.crop_height",
												"poster_crop.crop_rotation",
												"poster_crop.crop_skew_x",
												"poster_crop.crop_skew_y",
												"poster_crop.blur_hash",
												"poster_crop.average_color",
												"poster_crop.base64",
												"poster_crop.is_dark",
												"poster_crop.is_light",
											])
											.where(
												"poster_crop.parent_media_id",
												"=",
												sql.ref<number>("poster.id"),
											)
											.where("poster_crop.relation_type", "=", "crop")
											.where(
												"poster_crop.is_deleted",
												"=",
												this.dbAdapter.getDefault("boolean", "false"),
											),
									)
									.as("crop"),
							])
							.whereRef("poster.parent_media_id", "=", "lucid_media.id")
							.where("poster.relation_type", "=", "poster")
							.where(
								"poster.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("poster"),
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as crop")
							.select([
								"crop.id",
								"crop.key",
								"crop.status",
								"crop.storage_adapter_key",
								"crop.storage_adapter_reference",
								"crop.storage_adapter_data",
								"crop.public",
								"crop.origin",
								"crop.type",
								"crop.mime_type",
								"crop.file_extension",
								"crop.file_name",
								"crop.file_size",
								"crop.width",
								"crop.height",
								"crop.focal_x",
								"crop.focal_y",
								"crop.crop_x",
								"crop.crop_y",
								"crop.crop_width",
								"crop.crop_height",
								"crop.crop_rotation",
								"crop.crop_skew_x",
								"crop.crop_skew_y",
								"crop.blur_hash",
								"crop.average_color",
								"crop.base64",
								"crop.is_dark",
								"crop.is_light",
							])
							.whereRef("crop.parent_media_id", "=", "lucid_media.id")
							.where("crop.relation_type", "=", "crop")
							.where(
								"crop.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("crop"),
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media_translations")
							.select([
								"lucid_media_translations.title",
								"lucid_media_translations.alt",
								"lucid_media_translations.description",
								"lucid_media_translations.summary",
								"lucid_media_translations.locale_code",
							])
							.whereRef(
								"lucid_media_translations.media_id",
								"=",
								"lucid_media.id",
							),
					)
					.as("translations"),
			])
			.where("id", "in", props.ids)
			.where("parent_media_id", "is", null);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleByIds",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: [
				"id",
				"key",
				"status",
				"storage_adapter_key",
				"storage_adapter_reference",
				"storage_adapter_data",
				"folder_id",
				"parent_media_id",
				"relation_type",
				"e_tag",
				"origin",
				"type",
				"mime_type",
				"file_extension",
				"file_name",
				"file_size",
				"width",
				"height",
				"focal_x",
				"focal_y",
				"crop_x",
				"crop_y",
				"crop_width",
				"crop_height",
				"crop_rotation",
				"crop_skew_x",
				"crop_skew_y",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_color",
				"base64",
				"is_dark",
				"is_light",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"translations",
				"public",
				"poster",
				"crop",
			],
		});
	}
	/** Fetches media rows used by field validation. */
	async selectMultipleValidationData<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				ids: number[];
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_media")
			.select(["id", "file_extension", "width", "height", "type"])
			.where("id", "in", props.ids)
			.where("parent_media_id", "is", null);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleValidationData",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: ["id", "file_extension", "width", "height", "type"],
		});
	}

	/** Fetches media IDs inside folders. */
	async selectMultipleIdsByFolderIds<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				folderIds: number[];
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_media")
			.select(["id"])
			.where("folder_id", "in", props.folderIds);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleIdsByFolderIds",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			schema: this.config.schema.pick({
				id: true,
			}),
			select: ["id"],
		});
	}
	async selectMultipleFilteredFixed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: GetMultipleQueryParams;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_media")
					.leftJoin("lucid_media_translations as translation", (join) =>
						join.onRef("translation.media_id", "=", "lucid_media.id"),
					)
					.select((eb) => [
						"lucid_media.id",
						"lucid_media.key",
						"lucid_media.status",
						"lucid_media.storage_adapter_key",
						"lucid_media.storage_adapter_reference",
						"lucid_media.storage_adapter_data",
						"lucid_media.folder_id",
						"lucid_media.parent_media_id",
						"lucid_media.relation_type",
						"lucid_media.e_tag",
						"lucid_media.origin",
						"lucid_media.type",
						"lucid_media.mime_type",
						"lucid_media.file_extension",
						"lucid_media.file_name",
						"lucid_media.file_size",
						"lucid_media.width",
						"lucid_media.height",
						"lucid_media.focal_x",
						"lucid_media.focal_y",
						"lucid_media.crop_x",
						"lucid_media.crop_y",
						"lucid_media.crop_width",
						"lucid_media.crop_height",
						"lucid_media.crop_rotation",
						"lucid_media.crop_skew_x",
						"lucid_media.crop_skew_y",
						"lucid_media.blur_hash",
						"lucid_media.average_color",
						"lucid_media.base64",
						"lucid_media.is_dark",
						"lucid_media.is_light",
						"lucid_media.created_at",
						"lucid_media.updated_at",
						"lucid_media.is_deleted",
						"lucid_media.is_deleted_at",
						"lucid_media.deleted_by",
						"lucid_media.public",
						eb.fn.min<string>("translation.title").as("title_sort"),
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media_translations")
									.select([
										"lucid_media_translations.title",
										"lucid_media_translations.alt",
										"lucid_media_translations.description",
										"lucid_media_translations.summary",
										"lucid_media_translations.locale_code",
									])
									.whereRef(
										"lucid_media_translations.media_id",
										"=",
										"lucid_media.id",
									),
							)
							.as("translations"),
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media as poster")
									.select([
										"poster.id",
										"poster.key",
										"poster.status",
										"poster.storage_adapter_key",
										"poster.storage_adapter_reference",
										"poster.storage_adapter_data",
										"poster.public",
										"poster.origin",
										"poster.type",
										"poster.mime_type",
										"poster.file_extension",
										"poster.file_name",
										"poster.file_size",
										"poster.width",
										"poster.height",
										"poster.focal_x",
										"poster.focal_y",
										"poster.crop_x",
										"poster.crop_y",
										"poster.crop_width",
										"poster.crop_height",
										"poster.crop_rotation",
										"poster.crop_skew_x",
										"poster.crop_skew_y",
										"poster.blur_hash",
										"poster.average_color",
										"poster.base64",
										"poster.is_dark",
										"poster.is_light",
										this.database.fn
											.jsonArrayFrom(
												eb
													.selectFrom("lucid_media_translations")
													.select([
														"lucid_media_translations.title",
														"lucid_media_translations.alt",
														"lucid_media_translations.description",
														"lucid_media_translations.summary",
														"lucid_media_translations.locale_code",
													])
													.whereRef(
														"lucid_media_translations.media_id",
														"=",
														sql.ref("poster.id"),
													),
											)
											.as("translations"),
										activeMediaCropSelect(this.database, "poster.id"),
									])
									.whereRef("poster.parent_media_id", "=", "lucid_media.id")
									.where("poster.relation_type", "=", "poster")
									.where(
										"poster.is_deleted",
										"=",
										this.dbAdapter.getDefault("boolean", "false"),
									),
							)
							.as("poster"),
						activeMediaCropSelect(this.database, "lucid_media.id"),
					])
					.where(
						"lucid_media.is_hidden",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					)
					.where("lucid_media.parent_media_id", "is", null)
					.groupBy("lucid_media.id");

				const countQuery = this.db
					.selectFrom("lucid_media")
					.select(sql`count(distinct lucid_media.id)`.as("count"))
					.leftJoin("lucid_media_translations as translation", (join) =>
						join.onRef("translation.media_id", "=", "lucid_media.id"),
					)
					.where(
						"lucid_media.is_hidden",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					)
					.where("lucid_media.parent_media_id", "is", null);

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: {
							tableKeys: {
								filters: {
									title: "translation.title",
									...this.config.queryConfig.tableKeys.filters,
								},
								sorts: {
									title: "title_sort",
									...this.config.queryConfig.tableKeys.sorts,
								},
							},
							operators: {
								title: "contains",
							},
						},
					},
				);

				const [mainResult, countResult] = await Promise.all([
					main.execute(),
					count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
				]);

				return [mainResult, countResult] as const;
			},
			{
				method: "selectMultipleFilteredFixed",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: [
				"id",
				"key",
				"status",
				"storage_adapter_key",
				"storage_adapter_reference",
				"storage_adapter_data",
				"folder_id",
				"parent_media_id",
				"relation_type",
				"e_tag",
				"origin",
				"type",
				"mime_type",
				"file_extension",
				"file_name",
				"file_size",
				"width",
				"height",
				"focal_x",
				"focal_y",
				"crop_x",
				"crop_y",
				"crop_width",
				"crop_height",
				"crop_rotation",
				"crop_skew_x",
				"crop_skew_y",
				"blur_hash",
				"average_color",
				"base64",
				"is_dark",
				"is_light",
				"created_at",
				"updated_at",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"public",
				"translations",
				"poster",
				"crop",
			],
		});
	}
}
