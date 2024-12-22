import { sql } from "kysely";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type z from "zod";
import type { BooleanInt, LucidMedia, Select, KyselyDB } from "../db/types.js";
import type mediaSchema from "../../schemas/media.js";
import type { Config } from "../../types/config.js";

export default class MediaRepo {
	constructor(private db: KyselyDB) {}

	// ----------------------------------------
	// select
	selectSingle = async <K extends keyof Select<LucidMedia>>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_media">;
	}) => {
		let query = this.db.selectFrom("lucid_media").select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidMedia>, K> | undefined
		>;
	};
	selectSingleById = async (props: {
		id: number;
		config: Config;
	}) => {
		return this.db
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
					.as("title_translations"),
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
					.as("alt_translations"),
			])
			.where("visible", "=", 1)
			.where("id", "=", props.id)
			.executeTakeFirst();
	};
	selectMultiple = async <K extends keyof Select<LucidMedia>>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_media">;
	}) => {
		let query = this.db.selectFrom("lucid_media").select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.execute() as Promise<Array<Pick<Select<LucidMedia>, K>>>;
	};
	selectMultipleFiltered = async (props: {
		localeCode: string;
		query: z.infer<typeof mediaSchema.getMultiple.query>;
		config: Config;
	}) => {
		const mediasQuery = this.db
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
					.as("title_translations"),
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
			.where("visible", "=", 1);

		const mediasCountQuery = this.db
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
			.where("visible", "=", 1);

		const { main, count } = queryBuilder.main(
			{
				main: mediasQuery,
				count: mediasCountQuery,
			},
			{
				queryParams: {
					filter: props.query.filter,
					sort: props.query.sort,
					include: props.query.include,
					exclude: props.query.exclude,
					page: props.query.page,
					perPage: props.query.perPage,
				},
				meta: {
					tableKeys: {
						filters: {
							title: "title_translations.value",
							key: "key",
							mimeType: "mime_type",
							type: "type",
							extension: "file_extension",
						},
						sorts: {
							title: "title_translations.value",
							createdAt: "created_at",
							updatedAt: "updated_at",
							fileSize: "file_size",
							width: "width",
							height: "height",
							mimeType: "mime_type",
							extension: "file_extension",
						},
					},
					defaultOperators: {
						title: props.config.db.config.fuzzOperator,
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
	// create
	createSingle = async (props: {
		key: string;
		visible: BooleanInt;
		eTag?: string;
		type: LucidMedia["type"];
		mimeType: string;
		extension: string;
		fileSize: number;
		width?: number | null;
		height?: number | null;
		updatedAt?: string;
		titleTranslationKeyId?: number;
		altTranslationKeyId?: number;
		blurHash?: string | null;
		averageColour?: string | null;
		isDark?: BooleanInt | null;
		isLight?: BooleanInt | null;
	}) => {
		return this.db
			.insertInto("lucid_media")
			.values({
				key: props.key,
				e_tag: props.eTag,
				visible: props.visible,
				type: props.type,
				mime_type: props.mimeType,
				file_extension: props.extension,
				file_size: props.fileSize,
				width: props.width,
				height: props.height,
				title_translation_key_id: props.titleTranslationKeyId,
				alt_translation_key_id: props.altTranslationKeyId,
				blur_hash: props.blurHash,
				average_colour: props.averageColour,
				is_dark: props.isDark,
				is_light: props.isLight,
			})
			.returning("id")
			.executeTakeFirst();
	};
	// ----------------------------------------
	// update
	updateSingle = async (props: {
		where: QueryBuilderWhere<"lucid_media">;
		data: {
			key?: string;
			eTag?: string | null;
			type?: LucidMedia["type"];
			mimeType?: string;
			extension?: string;
			fileSize?: number;
			width?: number | null;
			height?: number | null;
			updatedAt?: string;
			blurHash?: string | null;
			averageColour?: string | null;
			isDark?: BooleanInt | null;
			isLight?: BooleanInt | null;
		};
	}) => {
		let query = this.db
			.updateTable("lucid_media")
			.set({
				key: props.data.key,
				e_tag: props.data.eTag,
				type: props.data.type,
				mime_type: props.data.mimeType,
				file_extension: props.data.extension,
				file_size: props.data.fileSize,
				width: props.data.width,
				height: props.data.height,
				updated_at: props.data.updatedAt,
				blur_hash: props.data.blurHash,
				average_colour: props.data.averageColour,
				is_dark: props.data.isDark,
				is_light: props.data.isLight,
			})
			.returning("id");

		query = queryBuilder.update(query, props.where);

		return query.executeTakeFirst();
	};
	// ----------------------------------------
	// delete
	deleteSingle = async (props: {
		where: QueryBuilderWhere<"lucid_media">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_media")
			.returning([
				"file_size",
				"id",
				"key",
				"title_translation_key_id",
				"alt_translation_key_id",
			]);

		query = queryBuilder.delete(query, props.where);

		return query.executeTakeFirst();
	};
}
