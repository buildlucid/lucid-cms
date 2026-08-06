import { sql } from "kysely";
import z from "zod";
import type { GetUsageQueryParams } from "../../schemas/ai.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { aiGenerationsTable } from "../db/tables/ai-generations.js";
import type { LucidAiGenerations } from "../db/tables/index.js";
import type { Insert, Select } from "../db/types.js";
import { activeMediaCropSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface AiUsageChartRowPropT {
	created_at: Date | string;
	feature_key: string;
	usage: Record<string, unknown> | null;
	credits_charged: string | null;
}

export default class AiGenerationsRepository extends StaticRepository<"lucid_ai_generations"> {
	constructor(db: LucidDatabase) {
		super(db, aiGenerationsTable);
	}

	/**
	 * Inserts a completed generation once using the remote request identity.
	 * Concurrent duplicate responses are ignored by the database constraint.
	 */
	async createIfRequestAbsent<
		K extends keyof Select<LucidAiGenerations>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidAiGenerations>>;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		const query = this.db
			.insertInto("lucid_ai_generations")
			.values(this.asInsertData(props.data))
			.onConflict((conflict) => conflict.column("request_id").doNothing())
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				(qb) => qb.returning(props.returning as K[]),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidAiGenerations>, K> | undefined
				>,
			{ method: "createIfRequestAbsent" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning,
			selectAll: props.returnAll,
		});
	}

	async selectSingleByRequestId<
		K extends keyof Select<LucidAiGenerations>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				requestId: string;
				select: K[];
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_ai_generations")
			.select(props.select)
			.where("request_id", "=", props.requestId);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidAiGenerations>, K> | undefined
				>,
			{
				method: "selectSingleByRequestId",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.select,
		});
	}

	async selectUsageChartRows<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				startDate: string;
				endDate: string;
				featureKey?: string;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				let query = this.db
					.selectFrom("lucid_ai_generations")
					.select(["created_at", "feature_key", "usage", "credits_charged"])
					.where("created_at", ">=", props.startDate)
					.where("created_at", "<", props.endDate);

				if (props.featureKey) {
					query = query.where("feature_key", "=", props.featureKey);
				}

				return await query.execute();
			},
			{
				method: "selectUsageChartRows",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			schema: this.config.schema.pick({
				created_at: true,
				feature_key: true,
				usage: true,
				credits_charged: true,
			}),
			select: ["created_at", "feature_key", "usage", "credits_charged"],
		});
	}

	async selectUsageMultiple<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: GetUsageQueryParams;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_ai_generations")
					.leftJoin(
						"lucid_users",
						"lucid_users.id",
						"lucid_ai_generations.user_id",
					)
					.select((eb) => [
						"lucid_ai_generations.id",
						"lucid_ai_generations.request_id",
						"lucid_ai_generations.provider_request_id",
						"lucid_ai_generations.feature_key",
						"lucid_ai_generations.feature_version",
						"lucid_ai_generations.user_id",
						"lucid_ai_generations.target_type",
						"lucid_ai_generations.target",
						"lucid_ai_generations.usage",
						"lucid_ai_generations.model",
						"lucid_ai_generations.credits_charged",
						"lucid_ai_generations.duration_ms",
						"lucid_ai_generations.status",
						"lucid_ai_generations.error_message",
						"lucid_ai_generations.created_at",
						"lucid_users.email",
						"lucid_users.username",
						"lucid_users.first_name",
						"lucid_users.last_name",
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media")
									.select((mediaEb) => [
										"lucid_media.id",
										"lucid_media.key",
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
										"lucid_media.base64",
										"lucid_media.is_dark",
										"lucid_media.is_light",
										activeMediaCropSelect(this.database, "lucid_media.id"),
										this.database.fn
											.jsonArrayFrom(
												mediaEb
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
									.whereRef(
										"lucid_media.id",
										"=",
										"lucid_users.profile_picture_media_id",
									)
									.where(
										"lucid_media.is_deleted",
										"=",
										this.dbAdapter.getDefault("boolean", "false"),
									),
							)
							.as("profile_picture"),
					]);

				const countQuery = this.db
					.selectFrom("lucid_ai_generations")
					.leftJoin(
						"lucid_users",
						"lucid_users.id",
						"lucid_ai_generations.user_id",
					)
					.select(sql`count(*)`.as("count"));
				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: this.config.queryConfig,
					},
				);

				const [mainResult, countResult] = await Promise.all([
					main.execute(),
					count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
				]);

				return [mainResult, countResult] as const;
			},
			{
				method: "selectUsageMultiple",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			schema: this.config.schema.extend({
				email: z.string().nullable(),
				username: z.string().nullable(),
				first_name: z.string().nullable(),
				last_name: z.string().nullable(),
				profile_picture: z.array(z.unknown()).optional(),
			}),
			select: [
				"id",
				"request_id",
				"provider_request_id",
				"feature_key",
				"feature_version",
				"user_id",
				"target_type",
				"target",
				"usage",
				"model",
				"credits_charged",
				"duration_ms",
				"status",
				"error_message",
				"created_at",
				"email",
				"username",
				"first_name",
				"last_name",
				"profile_picture",
			],
		});
	}
}
