import { sql } from "kysely";
import z from "zod/v4";
import type { GetMultipleQueryParams } from "../../schemas/media.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import queryBuilder from "../query-builder/index.js";
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
		e_tag: z.string().nullable(),
		public: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		type: z.string(),
		mime_type: z.string(),
		file_extension: z.string(),
		file_size: z.number(),
		width: z.number().nullable(),
		height: z.number().nullable(),
		blur_hash: z.string().nullable(),
		average_color: z.string().nullable(),
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
					title: z.string().nullable(),
					alt: z.string().nullable(),
					locale_code: z.string().nullable(),
				}),
			)
			.optional(),
		custom_meta: z.string().nullable(),
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
		e_tag: this.dbAdapter.getDataType("text"),
		public: this.dbAdapter.getDataType("boolean"),
		type: this.dbAdapter.getDataType("text"),
		mime_type: this.dbAdapter.getDataType("text"),
		file_extension: this.dbAdapter.getDataType("text"),
		file_size: this.dbAdapter.getDataType("integer"),
		width: this.dbAdapter.getDataType("integer"),
		height: this.dbAdapter.getDataType("integer"),
		blur_hash: this.dbAdapter.getDataType("text"),
		average_color: this.dbAdapter.getDataType("text"),
		is_dark: this.dbAdapter.getDataType("boolean"),
		is_light: this.dbAdapter.getDataType("boolean"),
		custom_meta: this.dbAdapter.getDataType("text"),
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
	async selectSingleById<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_media")
			.select((eb) => [
				"id",
				"key",
				"folder_id",
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
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
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media_translations")
							.select([
								"lucid_media_translations.title",
								"lucid_media_translations.alt",
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
			.where("id", "=", props.id);

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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_color",
				"is_dark",
				"is_light",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"translations",
				"public",
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
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
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media_translations")
							.select([
								"lucid_media_translations.title",
								"lucid_media_translations.alt",
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_color",
				"is_dark",
				"is_light",
				"is_deleted",
				"is_deleted_at",
				"deleted_by",
				"translations",
				"public",
			],
		});
	}
	async selectMultipleFilteredFixed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				localeCode: string;
				queryParams: GetMultipleQueryParams;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_media")
					.select((eb) => [
						"lucid_media.id",
						"lucid_media.key",
						"lucid_media.folder_id",
						"lucid_media.e_tag",
						"lucid_media.type",
						"lucid_media.mime_type",
						"lucid_media.file_extension",
						"lucid_media.file_size",
						"lucid_media.width",
						"lucid_media.height",
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
									.selectFrom("lucid_media_translations")
									.select([
										"lucid_media_translations.title",
										"lucid_media_translations.alt",
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
					.leftJoin("lucid_media_translations as translation", (join) =>
						join
							.onRef("translation.media_id", "=", "lucid_media.id")
							.on("translation.locale_code", "=", props.localeCode),
					)
					.groupBy(["lucid_media.id", "translation.title", "translation.alt"]);

				const countQuery = this.db
					.selectFrom("lucid_media")
					.select(sql`count(distinct lucid_media.id)`.as("count"))
					.leftJoin("lucid_media_translations as translation", (join) =>
						join
							.onRef("translation.media_id", "=", "lucid_media.id")
							.on("translation.locale_code", "=", props.localeCode),
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
									title: "translation.title",
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"translations",
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
