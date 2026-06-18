import { sql } from "kysely";
import z from "zod";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
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
		poster_id: z.number().nullable(),
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
		poster_id: this.dbAdapter.getDataType("integer"),
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

	async selectSingleById<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				tenantKey?: string | null;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_media")
			.select((eb) => [
				"id",
				"key",
				"folder_id",
				"poster_id",
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
												"lucid_media.poster_id",
											),
									)
									.as("translations"),
							])
							.whereRef("poster.id", "=", "lucid_media.poster_id"),
					)
					.as("poster"),
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
				"poster_id",
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
			],
		});
	}
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
				"poster_id",
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
												"lucid_media.poster_id",
											),
									)
									.as("translations"),
							])
							.whereRef("poster.id", "=", "lucid_media.poster_id"),
					)
					.as("poster"),
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
			.where("id", "in", props.ids);

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
				"poster_id",
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
			.where("id", "in", props.ids);

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
						"lucid_media.poster_id",
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
						"lucid_media.blur_hash",
						"lucid_media.average_color",
						"lucid_media.is_dark",
						"lucid_media.is_light",
						"lucid_media.created_at",
						"lucid_media.updated_at",
						"lucid_media.is_deleted",
						"lucid_media.is_deleted_at",
						"lucid_media.deleted_by",
						"lucid_media.public",
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
										"poster.blur_hash",
										"poster.average_color",
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
														"lucid_media.poster_id",
													),
											)
											.as("translations"),
									])
									.whereRef("poster.id", "=", "lucid_media.poster_id"),
							)
							.as("poster"),
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
					])
					.where(
						"lucid_media.is_hidden",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					)
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
								title: this.dbAdapter.config.fuzzOperator,
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
				"poster_id",
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
				"translations",
				"poster",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_color",
				"is_dark",
				"is_light",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"public",
			],
		});
	}
}
