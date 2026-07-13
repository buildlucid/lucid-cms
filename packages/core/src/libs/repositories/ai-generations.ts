import { sql } from "kysely";
import z from "zod";
import type { GetUsageQueryParams } from "../../schemas/ai.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB, LucidAiGenerations, Select } from "../db/types.js";
import { activeMediaCropSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface AiUsageChartRowPropT {
	created_at: Date | string;
	feature_key: string;
	usage: Record<string, unknown> | null;
	cost_currency: string | null;
	cost_total_minor: number | null;
}

export default class AiGenerationsRepository extends StaticRepository<"lucid_ai_generations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_ai_generations");
	}
	tableSchema = z.object({
		id: z.number(),
		request_id: z.string(),
		provider_request_id: z.string().nullable(),
		feature_key: z.string(),
		feature_version: z.string(),
		tenant_key: z.string().nullable(),
		user_id: z.number().nullable(),
		target_type: z.string(),
		target: z.record(z.string(), z.unknown()),
		output: z.unknown().nullable(),
		usage: z.record(z.string(), z.unknown()).nullable(),
		model: z.string().nullable(),
		cost_currency: z.string().nullable(),
		cost_total_minor: z.number().nullable(),
		duration_ms: z.number().nullable(),
		status: z.enum(["failed", "pending", "success"]),
		error_message: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		request_id: this.dbAdapter.getDataType("text"),
		provider_request_id: this.dbAdapter.getDataType("text"),
		feature_key: this.dbAdapter.getDataType("text"),
		feature_version: this.dbAdapter.getDataType("text"),
		tenant_key: this.dbAdapter.getDataType("text"),
		user_id: this.dbAdapter.getDataType("integer"),
		target_type: this.dbAdapter.getDataType("text"),
		target: this.dbAdapter.getDataType("json"),
		output: this.dbAdapter.getDataType("json"),
		usage: this.dbAdapter.getDataType("json"),
		model: this.dbAdapter.getDataType("text"),
		cost_currency: this.dbAdapter.getDataType("text"),
		cost_total_minor: this.dbAdapter.getDataType("integer"),
		duration_ms: this.dbAdapter.getDataType("integer"),
		status: this.dbAdapter.getDataType("text"),
		error_message: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				requestId: "lucid_ai_generations.request_id",
				providerRequestId: "lucid_ai_generations.provider_request_id",
				featureKey: "lucid_ai_generations.feature_key",
				featureVersion: "lucid_ai_generations.feature_version",
				status: "lucid_ai_generations.status",
				model: "lucid_ai_generations.model",
				userId: "lucid_ai_generations.user_id",
				targetType: "lucid_ai_generations.target_type",
				durationMs: "lucid_ai_generations.duration_ms",
				createdAt: "lucid_ai_generations.created_at",
			},
			sorts: {
				createdAt: "lucid_ai_generations.created_at",
				cost: "lucid_ai_generations.cost_total_minor",
				durationMs: "lucid_ai_generations.duration_ms",
			},
		},
		operators: {
			requestId: "contains",
			providerRequestId: "contains",
			model: "contains",
			targetType: "contains",
		},
	} as const;

	async selectSingleByRequestId<
		K extends keyof Select<LucidAiGenerations>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				requestId: string;
				select: K[];
				tenantKey?: string | null;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_ai_generations")
			.select(props.select)
			.where("request_id", "=", props.requestId);

		query = queryBuilder.tenantScope(query, {
			tenantKey: props.tenantKey,
			column: "lucid_ai_generations.tenant_key",
		});

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
				tenantKey?: string | null;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				let query = this.db
					.selectFrom("lucid_ai_generations")
					.select([
						"created_at",
						"feature_key",
						"usage",
						"cost_currency",
						"cost_total_minor",
					])
					.where("created_at", ">=", props.startDate)
					.where("created_at", "<", props.endDate);

				query = queryBuilder.tenantScope(query, {
					tenantKey: props.tenantKey,
					column: "lucid_ai_generations.tenant_key",
				});

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
			schema: this.tableSchema.pick({
				created_at: true,
				feature_key: true,
				usage: true,
				cost_currency: true,
				cost_total_minor: true,
			}),
			select: [
				"created_at",
				"feature_key",
				"usage",
				"cost_currency",
				"cost_total_minor",
			],
		});
	}

	async selectUsageMultiple<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: GetUsageQueryParams;
				tenantKey?: string | null;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				let mainQuery = this.db
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
						"lucid_ai_generations.cost_currency",
						"lucid_ai_generations.cost_total_minor",
						"lucid_ai_generations.duration_ms",
						"lucid_ai_generations.status",
						"lucid_ai_generations.error_message",
						"lucid_ai_generations.created_at",
						"lucid_users.email",
						"lucid_users.username",
						"lucid_users.first_name",
						"lucid_users.last_name",
						this.dbAdapter
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
										activeMediaCropSelect(
											this.db,
											this.dbAdapter,
											"lucid_media.id",
										),
										this.dbAdapter
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

				let countQuery = this.db
					.selectFrom("lucid_ai_generations")
					.leftJoin(
						"lucid_users",
						"lucid_users.id",
						"lucid_ai_generations.user_id",
					)
					.select(sql`count(*)`.as("count"));
				mainQuery = queryBuilder.tenantScope(mainQuery, {
					tenantKey: props.tenantKey,
					column: "lucid_ai_generations.tenant_key",
				});
				countQuery = queryBuilder.tenantScope(countQuery, {
					tenantKey: props.tenantKey,
					column: "lucid_ai_generations.tenant_key",
				});

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: this.queryConfig,
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
			schema: this.tableSchema.extend({
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
				"cost_currency",
				"cost_total_minor",
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
