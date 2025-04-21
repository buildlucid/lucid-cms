import z from "zod";
import { sql } from "kysely";
import StaticRepository from "./parents/static-repository.js";
import queryBuilder from "../query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { QueryProps } from "./types.js";
import type { GetMultipleQueryParams } from "../../schemas/media.js";

export default class MediaRepository extends StaticRepository<"lucid_media"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_media");
	}
	tableSchema = z.object({
		id: z.number(),
		key: z.string(),
		e_tag: z.string().nullable(),
		visible: z.union([
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
		average_colour: z.string().nullable(),
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
		title_translation_key_id: z.number().nullable(),
		alt_translation_key_id: z.number().nullable(),
		title_translations: z
			.array(
				z.object({
					value: z.string().nullable(),
					locale_code: z.string().nullable(),
				}),
			)
			.optional(),
		alt_translations: z
			.array(
				z.object({
					value: z.string().nullable(),
					locale_code: z.string().nullable(),
				}),
			)
			.optional(),
		custom_meta: z.string().nullable(),
		created_at: z.string().nullable(),
		updated_at: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		key: this.dbAdapter.getDataType("text"),
		e_tag: this.dbAdapter.getDataType("text"),
		visible: this.dbAdapter.getDataType("boolean"),
		type: this.dbAdapter.getDataType("text"),
		mime_type: this.dbAdapter.getDataType("text"),
		file_extension: this.dbAdapter.getDataType("text"),
		file_size: this.dbAdapter.getDataType("integer"),
		width: this.dbAdapter.getDataType("integer"),
		height: this.dbAdapter.getDataType("integer"),
		blur_hash: this.dbAdapter.getDataType("text"),
		average_colour: this.dbAdapter.getDataType("text"),
		is_dark: this.dbAdapter.getDataType("boolean"),
		is_light: this.dbAdapter.getDataType("boolean"),
		title_translation_key_id: this.dbAdapter.getDataType("integer"),
		alt_translation_key_id: this.dbAdapter.getDataType("integer"),
		custom_meta: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				key: "key",
				mimeType: "mime_type",
				type: "type",
				extension: "file_extension",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				fileSize: "file_size",
				width: "width",
				height: "height",
				mimeType: "mime_type",
				extension: "file_extension",
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"title_translation_key_id",
				"alt_translation_key_id",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_colour",
				"is_dark",
				"is_light",
				this.dbAdapter
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
					.as("title_translations"),
				this.dbAdapter
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
					.as("alt_translations"),
			])
			.where("visible", "=", this.dbAdapter.getDefault("boolean", "true"))
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"title_translation_key_id",
				"alt_translation_key_id",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_colour",
				"is_dark",
				"is_light",
				"title_translations",
				"alt_translations",
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"title_translation_key_id",
				"alt_translation_key_id",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_colour",
				"is_dark",
				"is_light",
				this.dbAdapter
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
					.as("title_translations"),
				this.dbAdapter
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
					.as("alt_translations"),
			])
			.where("visible", "=", this.dbAdapter.getDefault("boolean", "true"))
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"title_translation_key_id",
				"alt_translation_key_id",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_colour",
				"is_dark",
				"is_light",
				"title_translations",
				"alt_translations",
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
						"lucid_media.e_tag",
						"lucid_media.type",
						"lucid_media.mime_type",
						"lucid_media.file_extension",
						"lucid_media.file_size",
						"lucid_media.width",
						"lucid_media.height",
						"lucid_media.blur_hash",
						"lucid_media.average_colour",
						"lucid_media.is_dark",
						"lucid_media.is_light",
						"lucid_media.title_translation_key_id",
						"lucid_media.alt_translation_key_id",
						"lucid_media.created_at",
						"lucid_media.updated_at",
						this.dbAdapter
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
							.as("title_translations"),
						this.dbAdapter
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
							.as("alt_translations"),
					])
					.leftJoin("lucid_translations as title_translations", (join) =>
						join
							.onRef(
								"title_translations.translation_key_id",
								"=",
								"lucid_media.title_translation_key_id",
							)
							.on("title_translations.locale_code", "=", props.localeCode),
					)
					.leftJoin("lucid_translations as alt_translations", (join) =>
						join
							.onRef(
								"alt_translations.translation_key_id",
								"=",
								"lucid_media.alt_translation_key_id",
							)
							.on("alt_translations.locale_code", "=", props.localeCode),
					)
					.select([
						"title_translations.value as title_translation_value",
						"alt_translations.value as alt_translation_value",
					])
					.groupBy([
						"lucid_media.id",
						"title_translations.value",
						"alt_translations.value",
					])
					.where("visible", "=", this.dbAdapter.getDefault("boolean", "true"));

				const countQuery = this.db
					.selectFrom("lucid_media")
					.select(sql`count(distinct lucid_media.id)`.as("count"))
					.leftJoin("lucid_translations as title_translations", (join) =>
						join
							.onRef(
								"title_translations.translation_key_id",
								"=",
								"lucid_media.title_translation_key_id",
							)
							.on("title_translations.locale_code", "=", props.localeCode),
					)
					.leftJoin("lucid_translations as alt_translations", (join) =>
						join
							.onRef(
								"alt_translations.translation_key_id",
								"=",
								"lucid_media.alt_translation_key_id",
							)
							.on("alt_translations.locale_code", "=", props.localeCode),
					)
					.select([
						"title_translations.value as title_translation_value",
						"alt_translations.value as alt_translation_value",
					])
					.where("visible", "=", this.dbAdapter.getDefault("boolean", "true"));

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
									title: "title_translations.value",
									...this.queryConfig.tableKeys.filters,
								},
								sorts: {
									title: "title_translations.value",
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
				"e_tag",
				"type",
				"mime_type",
				"file_extension",
				"file_size",
				"width",
				"height",
				"title_translation_key_id",
				"alt_translation_key_id",
				"created_at",
				"updated_at",
				"blur_hash",
				"average_colour",
				"is_dark",
				"is_light",
				"title_translations",
				"alt_translations",
			],
		});
	}
}
