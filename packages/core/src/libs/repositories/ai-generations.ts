import { sql } from "kysely";
import type { QueryParams } from "../../types/query-params.js";
import type { AiUsageSessionType } from "../../types/response.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { aiGenerationsTable } from "../db/tables/ai-generations.js";
import type { LucidAiGenerations } from "../db/tables/index.js";
import type { Insert, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class AiGenerationsRepository extends StaticRepository<"lucid_ai_generations"> {
	constructor(db: LucidDatabase) {
		super(db, aiGenerationsTable);
	}

	/** Postgres returns sums and counts as strings. */
	private selectSessionTotals() {
		return this.db
			.selectFrom("lucid_ai_generations")
			.select((eb) => [
				"lucid_ai_generations.session_type",
				"lucid_ai_generations.session_id",
				eb.fn.max("lucid_ai_generations.user_id").as("user_id"),
				sql<number | string | null>`sum(lucid_ai_generations.credits)`.as(
					"credits",
				),
				sql<number | string | null>`sum(lucid_ai_generations.input_tokens)`.as(
					"input_tokens",
				),
				sql<number | string | null>`sum(lucid_ai_generations.output_tokens)`.as(
					"output_tokens",
				),
				sql<number | string | null>`sum(lucid_ai_generations.total_tokens)`.as(
					"total_tokens",
				),
				sql<number | string>`count(*)`.as("requests"),
				sql<
					number | string
				>`sum(case when lucid_ai_generations.feature_key = 'web.search' and lucid_ai_generations.status = 'success' then 1 else 0 end)`.as(
					"web_searches",
				),
				sql<
					number | string
				>`sum(case when lucid_ai_generations.feature_key = 'web.fetch' and lucid_ai_generations.status = 'success' then 1 else 0 end)`.as(
					"web_fetches",
				),
				sql<
					number | string
				>`sum(case when lucid_ai_generations.status = 'failed' then 1 else 0 end)`.as(
					"failed",
				),
				sql<
					number | string
				>`sum(case when lucid_ai_generations.status = 'pending' then 1 else 0 end)`.as(
					"pending",
				),
				eb.fn.min("lucid_ai_generations.created_at").as("started_at"),
				eb.fn.max("lucid_ai_generations.created_at").as("last_activity_at"),
			])
			.groupBy([
				"lucid_ai_generations.session_type",
				"lucid_ai_generations.session_id",
			]);
	}
	async usageByRuns(runIds: string[]) {
		if (!runIds.length) return { error: undefined, data: [] };

		const query = this.db
			.selectFrom("lucid_ai_generations")
			.select([
				"agent_run_id",
				sql<number | string | null>`sum(credits)`.as("credits"),
				sql<number | string>`count(model)`.as("model_calls"),
			])
			.where("agent_run_id", "in", runIds)
			.groupBy("agent_run_id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "usageByRuns",
		});

		return exec.response;
	}
	/**
	 * A page of sessions with their totals. Filters match the session's
	 * requests, and `requestId` finds the session a request belongs to.
	 */
	async selectSessions(props: { queryParams: Partial<QueryParams> }) {
		const { main, count } = queryBuilder.main(
			{
				main: this.selectSessionTotals(),
				count: this.db
					.selectFrom("lucid_ai_generations")
					.select(
						sql`count(distinct lucid_ai_generations.session_type || ':' || lucid_ai_generations.session_id)`.as(
							"count",
						),
					),
			},
			{
				queryParams: props.queryParams,
				database: this.dbAdapter.config,
				meta: {
					...this.config.queryConfig,
					customFilters: {
						requestId: ({ eb, filter }) =>
							eb(
								"lucid_ai_generations.session_id",
								"in",
								eb
									.selectFrom("lucid_ai_generations as matched")
									.select("matched.session_id")
									.where("matched.request_id", "=", String(filter.value)),
							),
					},
				},
			},
		);
		const sorted = props.queryParams.sort?.length
			? main
			: main.orderBy("last_activity_at", "desc");

		const exec = await this.executeQuery(
			() =>
				Promise.all([
					sorted.execute(),
					count?.executeTakeFirst() as Promise<
						{ count: string | number } | undefined
					>,
				]),
			{ method: "selectSessions" },
		);

		return exec.response;
	}
	async selectSession(props: { type: AiUsageSessionType; id: string }) {
		const query = this.selectSessionTotals()
			.where("lucid_ai_generations.session_type", "=", props.type)
			.where("lucid_ai_generations.session_id", "=", props.id);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSession",
		});

		return exec.response;
	}
	async selectSessionRecords<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				type: AiUsageSessionType;
				id: string;
				queryParams: Partial<QueryParams>;
			}
		>,
	) {
		const { main, count } = queryBuilder.main(
			{
				main: this.db
					.selectFrom("lucid_ai_generations")
					.select([
						"id",
						"request_id",
						"provider_request_id",
						"feature_key",
						"feature_version",
						"status",
						"agent_run_id",
						"usage",
						"model",
						"credits",
						"input_tokens",
						"output_tokens",
						"total_tokens",
						"duration_ms",
						"error_message",
						"created_at",
					])
					.where("session_type", "=", props.type)
					.where("session_id", "=", props.id),
				count: this.db
					.selectFrom("lucid_ai_generations")
					.select(sql`count(*)`.as("count"))
					.where("session_type", "=", props.type)
					.where("session_id", "=", props.id),
			},
			{
				queryParams: props.queryParams,
				database: this.dbAdapter.config,
				meta: {
					tableKeys: {
						sorts: { createdAt: "lucid_ai_generations.created_at" },
					},
				},
			},
		);
		const sorted = props.queryParams.sort?.length
			? main
			: main.orderBy("created_at", "desc").orderBy("id", "desc");

		const exec = await this.executeQuery(
			() =>
				Promise.all([
					sorted.execute(),
					count?.executeTakeFirst() as Promise<
						{ count: string | number } | undefined
					>,
				]),
			{ method: "selectSessionRecords" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: [
				"id",
				"request_id",
				"provider_request_id",
				"feature_key",
				"feature_version",
				"status",
				"agent_run_id",
				"usage",
				"model",
				"credits",
				"input_tokens",
				"output_tokens",
				"total_tokens",
				"duration_ms",
				"error_message",
				"created_at",
			],
		});
	}
	async selectUsageChartRows<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				startDate: string;
				endDate: string;
				featureKey?: string;
				userId?: number;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_ai_generations")
			.select([
				"created_at",
				"session_type",
				"session_id",
				"credits",
				"total_tokens",
			])
			.where("created_at", ">=", props.startDate)
			.where("created_at", "<", props.endDate)
			.where("credits", "is not", null);

		if (props.featureKey) {
			query = query.where("feature_key", "=", props.featureKey);
		}
		if (props.userId !== undefined) {
			query = query.where("user_id", "=", props.userId);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectUsageChartRows",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: [
				"created_at",
				"session_type",
				"session_id",
				"credits",
				"total_tokens",
			],
		});
	}
	/**
	 * Inserts a generation once using the remote request identity.
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
	/** A terminal agent usage record can replace a pending record only once. */
	async upsertAgentUsage(props: {
		data: Partial<Insert<LucidAiGenerations>> & {
			request_id: string;
			status: "success" | "failed";
		};
	}) {
		const query = this.db
			.insertInto("lucid_ai_generations")
			.values(this.asInsertData(props.data))
			.onConflict((conflict) =>
				conflict
					.column("request_id")
					.doUpdateSet({
						provider_request_id: props.data.provider_request_id ?? null,
						usage: props.data.usage ?? null,
						model: props.data.model ?? null,
						credits: props.data.credits ?? null,
						input_tokens: props.data.input_tokens ?? null,
						output_tokens: props.data.output_tokens ?? null,
						total_tokens: props.data.total_tokens ?? null,
						duration_ms: props.data.duration_ms ?? null,
						status: props.data.status,
						error_message: props.data.error_message ?? null,
					})
					.where("lucid_ai_generations.status", "=", "pending"),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "upsertAgentUsage",
		});

		return exec.response;
	}
	/** Find pending requests for scheduled scans or a specific failed stream. */
	async pendingAgentUsage(props: {
		connectionId: number;
		before?: string;
		requestId?: string;
		limit: number;
	}) {
		let query = this.db
			.selectFrom("lucid_ai_generations")
			.select([
				"request_id",
				"feature_key",
				"agent_run_id",
				"session_id",
				"user_id",
				"lucid_remote_connection_id",
				"created_at",
			])
			.where("session_type", "=", "agent")
			.where("feature_key", "in", [
				"agent.chat",
				"agent.compact",
				"web.search",
				"web.fetch",
			])
			.where("feature_version", "=", "v1")
			.where("status", "=", "pending")
			.where("lucid_remote_connection_id", "=", props.connectionId);

		if (props.before) query = query.where("created_at", "<", props.before);
		if (props.requestId) {
			query = query.where("request_id", "=", props.requestId);
		}

		query = query.orderBy("created_at", "asc").limit(props.limit);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "pendingAgentUsage",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			mode: "multiple",
			select: [
				"request_id",
				"feature_key",
				"agent_run_id",
				"session_id",
				"user_id",
				"lucid_remote_connection_id",
				"created_at",
			],
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
}
