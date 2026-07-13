import { sql } from "kysely";
import z from "zod";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import { activeMediaCropSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class MediaRepository extends StaticRepository<"lucid_media"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_media");
	}
	tableSchema = z.object({
		id: z.number(),
		key: z.string(),
		folder_id: z.number().nullable(),
		parent_media_id: z.number().nullable(),
		relation_type: z.enum(["crop", "poster"]).nullable(),
		e_tag: z.string().nullable(),
		origin: z.enum(["human", "ai_generated", "ai_modified"]),
		ai_generation_id: z.number().nullable(),
		public: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		type: z.string(),
		mime_type: z.string(),
		file_extension: z.string(),
		file_name: z.string().nullable(),
		file_size: z.number(),
		width: z.number().nullable(),
		height: z.number().nullable(),
		focal_x: z.number().nullable(),
		focal_y: z.number().nullable(),
		crop_x: z.number().nullable(),
		crop_y: z.number().nullable(),
		crop_width: z.number().nullable(),
		crop_height: z.number().nullable(),
		crop_rotation: z.number().nullable(),
		crop_skew_x: z.number().nullable(),
		crop_skew_y: z.number().nullable(),
		blur_hash: z.string().nullable(),
		average_color: z.string().nullable(),
		base64: z.string().nullable().optional(),
		is_dark: z
			.union([
				z.literal(this.dbAdapter.config.defaults.boolean.true),
				z.literal(this.dbAdapter.config.defaults.boolean.false),
			])
			.nullable(),
		is_light: z
			.union([
				z.literal(this.dbAdapter.config.defaults.boolean.true),
				z.literal(this.dbAdapter.config.defaults.boolean.false),
			])
			.nullable(),
		is_hidden: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		translations: z
			.array(
				z.object({
					title: z.string().nullable(),
					alt: z.string().nullable(),
					description: z.string().nullable(),
					summary: z.string().nullable(),
					locale_code: z.string().nullable(),
				}),
			)
			.optional(),
		poster: z
			.array(
				z.object({
					id: z.number(),
					key: z.string(),
					origin: z.enum(["human", "ai_generated", "ai_modified"]),
					type: z.string(),
					mime_type: z.string(),
					file_extension: z.string(),
					file_name: z.string().nullable(),
					file_size: z.number(),
					width: z.number().nullable(),
					height: z.number().nullable(),
					focal_x: z.number().nullable(),
					focal_y: z.number().nullable(),
					crop_x: z.number().nullable().optional(),
					crop_y: z.number().nullable().optional(),
					crop_width: z.number().nullable().optional(),
					crop_height: z.number().nullable().optional(),
					crop_rotation: z.number().nullable().optional(),
					crop_skew_x: z.number().nullable().optional(),
					crop_skew_y: z.number().nullable().optional(),
					blur_hash: z.string().nullable(),
					average_color: z.string().nullable(),
					base64: z.string().nullable().optional(),
					is_dark: z
						.union([
							z.literal(this.dbAdapter.config.defaults.boolean.true),
							z.literal(this.dbAdapter.config.defaults.boolean.false),
						])
						.nullable(),
					is_light: z
						.union([
							z.literal(this.dbAdapter.config.defaults.boolean.true),
							z.literal(this.dbAdapter.config.defaults.boolean.false),
						])
						.nullable(),
					crop: z
						.array(
							z.object({
								id: z.number(),
								key: z.string(),
								origin: z.enum(["human", "ai_generated", "ai_modified"]),
								type: z.string(),
								mime_type: z.string(),
								file_extension: z.string(),
								file_name: z.string().nullable(),
								file_size: z.number(),
								width: z.number().nullable(),
								height: z.number().nullable(),
								focal_x: z.number().nullable(),
								focal_y: z.number().nullable(),
								crop_x: z.number(),
								crop_y: z.number(),
								crop_width: z.number(),
								crop_height: z.number(),
								crop_rotation: z.number(),
								crop_skew_x: z.number(),
								crop_skew_y: z.number(),
								blur_hash: z.string().nullable(),
								average_color: z.string().nullable(),
								base64: z.string().nullable().optional(),
								is_dark: z
									.union([
										z.literal(this.dbAdapter.config.defaults.boolean.true),
										z.literal(this.dbAdapter.config.defaults.boolean.false),
									])
									.nullable(),
								is_light: z
									.union([
										z.literal(this.dbAdapter.config.defaults.boolean.true),
										z.literal(this.dbAdapter.config.defaults.boolean.false),
									])
									.nullable(),
							}),
						)
						.optional(),
					translations: z
						.array(
							z.object({
								title: z.string().nullable().optional(),
								alt: z.string().nullable(),
								description: z.string().nullable().optional(),
								summary: z.string().nullable().optional(),
								locale_code: z.string().nullable(),
							}),
						)
						.optional(),
				}),
			)
			.optional(),
		crop: z
			.array(
				z.object({
					id: z.number(),
					key: z.string(),
					origin: z.enum(["human", "ai_generated", "ai_modified"]),
					type: z.string(),
					mime_type: z.string(),
					file_extension: z.string(),
					file_name: z.string().nullable(),
					file_size: z.number(),
					width: z.number().nullable(),
					height: z.number().nullable(),
					focal_x: z.number().nullable(),
					focal_y: z.number().nullable(),
					crop_x: z.number(),
					crop_y: z.number(),
					crop_width: z.number(),
					crop_height: z.number(),
					crop_rotation: z.number(),
					crop_skew_x: z.number(),
					crop_skew_y: z.number(),
					blur_hash: z.string().nullable(),
					average_color: z.string().nullable(),
					base64: z.string().nullable().optional(),
					is_dark: z
						.union([
							z.literal(this.dbAdapter.config.defaults.boolean.true),
							z.literal(this.dbAdapter.config.defaults.boolean.false),
						])
						.nullable(),
					is_light: z
						.union([
							z.literal(this.dbAdapter.config.defaults.boolean.true),
							z.literal(this.dbAdapter.config.defaults.boolean.false),
						])
						.nullable(),
				}),
			)
			.optional(),
		custom_meta: z.string().nullable(),
		tenant_key: z.string().nullable(),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.union([z.string(), z.date()]).nullable(),
		deleted_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		updated_by: z.number().nullable(),
		created_by: z.number().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		key: this.dbAdapter.getDataType("text"),
		folder_id: this.dbAdapter.getDataType("integer"),
		parent_media_id: this.dbAdapter.getDataType("integer"),
		relation_type: this.dbAdapter.getDataType("text"),
		e_tag: this.dbAdapter.getDataType("text"),
		origin: this.dbAdapter.getDataType("text"),
		ai_generation_id: this.dbAdapter.getDataType("integer"),
		public: this.dbAdapter.getDataType("boolean"),
		type: this.dbAdapter.getDataType("text"),
		mime_type: this.dbAdapter.getDataType("text"),
		file_extension: this.dbAdapter.getDataType("text"),
		file_name: this.dbAdapter.getDataType("text"),
		file_size: this.dbAdapter.getDataType("integer"),
		width: this.dbAdapter.getDataType("integer"),
		height: this.dbAdapter.getDataType("integer"),
		focal_x: this.dbAdapter.getDataType("integer"),
		focal_y: this.dbAdapter.getDataType("integer"),
		crop_x: this.dbAdapter.getDataType("real"),
		crop_y: this.dbAdapter.getDataType("real"),
		crop_width: this.dbAdapter.getDataType("real"),
		crop_height: this.dbAdapter.getDataType("real"),
		crop_rotation: this.dbAdapter.getDataType("real"),
		crop_skew_x: this.dbAdapter.getDataType("real"),
		crop_skew_y: this.dbAdapter.getDataType("real"),
		blur_hash: this.dbAdapter.getDataType("text"),
		average_color: this.dbAdapter.getDataType("text"),
		base64: this.dbAdapter.getDataType("text"),
		is_dark: this.dbAdapter.getDataType("boolean"),
		is_light: this.dbAdapter.getDataType("boolean"),
		custom_meta: this.dbAdapter.getDataType("text"),
		tenant_key: this.dbAdapter.getDataType("text"),
		is_hidden: this.dbAdapter.getDataType("boolean"),
		is_deleted: this.dbAdapter.getDataType("boolean"),
		is_deleted_at: this.dbAdapter.getDataType("timestamp"),
		deleted_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		updated_by: this.dbAdapter.getDataType("integer"),
		created_by: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				key: "key",
				mimeType: "mime_type",
				type: "type",
				extension: "file_extension",
				folderId: "folder_id",
				isDeleted: "is_deleted",
				deletedBy: "deleted_by",
				public: "public",
				isHidden: "is_hidden",
				origin: "origin",
				fileSize: "file_size",
				width: "width",
				height: "height",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				fileSize: "file_size",
				width: "width",
				height: "height",
				mimeType: "mime_type",
				extension: "file_extension",
				deletedBy: "deleted_by",
				isDeletedAt: "is_deleted_at",
			},
		},
	} as const;

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

	async sumFileSizeByTenant(props: { tenantKey: string | null }) {
		let query = this.db
			.selectFrom("lucid_media")
			.select(sql<string | number>`COALESCE(SUM(file_size), 0)`.as("total"));

		query =
			props.tenantKey === null
				? query.where("tenant_key", "is", null)
				: query.where("tenant_key", "=", props.tenantKey);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					{ total: string | number | null } | undefined
				>,
			{
				method: "sumFileSizeByTenant",
			},
		);
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: Number(exec.response.data?.total ?? 0),
		};
	}

	async sumFileSizeGroupedByTenant() {
		const query = this.db
			.selectFrom("lucid_media")
			.select([
				"tenant_key",
				sql<string | number>`COALESCE(SUM(file_size), 0)`.as("total"),
			])
			.groupBy("tenant_key");

		const exec = await this.executeQuery(
			() =>
				query.execute() as Promise<
					{ tenant_key: string | null; total: string | number | null }[]
				>,
			{
				method: "sumFileSizeGroupedByTenant",
			},
		);
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: exec.response.data.map((row) => ({
				tenant_key: row.tenant_key,
				total: Number(row.total ?? 0),
			})),
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
				"source.file_name as source_file_name",
				"source.file_extension as source_file_extension",
				"source.tenant_key as source_tenant_key",
				"active_crop.id as active_crop_id",
				"active_crop.type as active_crop_type",
				"active_crop.key as active_crop_key",
				"active_crop.file_name as active_crop_file_name",
				"active_crop.file_extension as active_crop_file_extension",
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
					file_name:
						result.active_crop_id !== null
							? result.active_crop_file_name
							: result.source_file_name,
					file_extension:
						result.active_crop_file_extension ?? result.source_file_extension,
					tenant_key: result.source_tenant_key,
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
				tenantKey?: string | null;
				includeOwned?: boolean;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_media")
			.select((eb) => [
				"id",
				"key",
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
				"tenant_key",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as poster")
							.select([
								"poster.id",
								"poster.key",
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
								this.dbAdapter
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
								this.dbAdapter
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_media as poster_crop")
											.select([
												"poster_crop.id",
												"poster_crop.key",
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
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as crop")
							.select([
								"crop.id",
								"crop.key",
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
				this.dbAdapter
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
			)
			.$call((qb) =>
				queryBuilder.tenantScope(qb, {
					tenantKey: props.tenantKey,
					column: "lucid_media.tenant_key",
				}),
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
				"tenant_key",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as poster")
							.select([
								"poster.id",
								"poster.key",
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
								this.dbAdapter
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
								this.dbAdapter
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_media as poster_crop")
											.select([
												"poster_crop.id",
												"poster_crop.key",
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
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media as crop")
							.select([
								"crop.id",
								"crop.key",
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
				this.dbAdapter
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
	/**
	 * Fetches media rows used by field validation, scoped to the request tenant while
	 * keeping global media available to every tenant.
	 */
	async selectMultipleValidationData<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				ids: number[];
				tenantKey?: string | null;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_media")
			.select(["id", "file_extension", "width", "height", "type"])
			.where("id", "in", props.ids)
			.where("parent_media_id", "is", null);

		query = queryBuilder.tenantScope(query, {
			tenantKey: props.tenantKey,
			column: "lucid_media.tenant_key",
		});

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

	/**
	 * Fetches media IDs inside folders using tenant visibility rules.
	 * Delete flows use the returned IDs so updates cannot touch hidden tenant rows.
	 */
	async selectMultipleIdsByFolderIds<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				folderIds: number[];
				tenantKey?: string | null;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_media")
			.select(["id"])
			.where("folder_id", "in", props.folderIds);

		query = queryBuilder.tenantScope(query, {
			tenantKey: props.tenantKey,
			column: "lucid_media.tenant_key",
		});

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleIdsByFolderIds",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			schema: this.tableSchema.pick({
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
				tenantKey?: string | null;
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
						"lucid_media.tenant_key",
						eb.fn.min<string>("translation.title").as("title_sort"),
						this.dbAdapter
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
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media as poster")
									.select([
										"poster.id",
										"poster.key",
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
										this.dbAdapter
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
										activeMediaCropSelect(this.db, this.dbAdapter, "poster.id"),
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
						activeMediaCropSelect(this.db, this.dbAdapter, "lucid_media.id"),
					])
					.where(
						"lucid_media.is_hidden",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					)
					.where("lucid_media.parent_media_id", "is", null)
					.groupBy("lucid_media.id")
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_media.tenant_key",
						}),
					);

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
					.where("lucid_media.parent_media_id", "is", null)
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_media.tenant_key",
						}),
					);

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
									...this.queryConfig.tableKeys.filters,
								},
								sorts: {
									// @ts-expect-error
									title: "title_sort",
									...this.queryConfig.tableKeys.sorts,
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
				"tenant_key",
				"translations",
				"poster",
				"crop",
			],
		});
	}
}
