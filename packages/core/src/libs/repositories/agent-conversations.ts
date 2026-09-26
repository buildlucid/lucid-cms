import constants from "../../constants/constants.js";
import type { QueryParams } from "../../types/query-params.js";
import type { ConversationContext } from "../agent/types.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { agentConversationsTable } from "../db/tables/agent-conversations.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentConversationsRepository extends StaticRepository<"lucid_agent_conversations"> {
	constructor(db: LucidDatabase) {
		super(db, agentConversationsTable);
	}

	/** Joins each conversation's most recent run. */
	private selectWithLatestRun() {
		return this.db
			.selectFrom("lucid_agent_conversations")
			.leftJoin("lucid_agent_runs", (join) =>
				join.on((eb) =>
					eb(
						"lucid_agent_runs.id",
						"=",
						eb
							.selectFrom("lucid_agent_runs as latest")
							.select("latest.id")
							.whereRef(
								"latest.conversation_id",
								"=",
								"lucid_agent_conversations.id",
							)
							.orderBy("latest.created_at", "desc")
							.orderBy("latest.id", "desc")
							.limit(1),
					),
				),
			);
	}
	/** Lists a user's own chats for agents they use, and code routine chats for agents they manage. */
	async selectMultipleFilteredForAccess(props: {
		userId: number;
		agentKeys: { use: string[]; manage: string[] };
		queryParams: Partial<QueryParams>;
	}) {
		const { main, count } = queryBuilder.main(
			{
				main: this.selectWithLatestRun()
					.select([
						"lucid_agent_conversations.id",
						"lucid_agent_conversations.agent_key",
						"lucid_agent_conversations.title",
						"lucid_agent_conversations.user_id",
						"lucid_agent_conversations.routine_id",
						"lucid_agent_conversations.active_run_id",
						"lucid_agent_conversations.queue_paused",
						"lucid_agent_conversations.context",
						"lucid_agent_conversations.created_at",
						"lucid_agent_conversations.updated_at",
						"lucid_agent_runs.id as latest_run_id",
						"lucid_agent_runs.status as latest_run_status",
						"lucid_agent_runs.outcome as latest_run_outcome",
						"lucid_agent_runs.error_message as latest_run_error",
					])
					.where((eb) =>
						eb.or([
							...(props.agentKeys.use.length
								? [
										eb.and([
											eb(
												"lucid_agent_conversations.user_id",
												"=",
												props.userId,
											),
											eb(
												"lucid_agent_conversations.agent_key",
												"in",
												props.agentKeys.use,
											),
										]),
									]
								: []),
							...(props.agentKeys.manage.length
								? [
										eb.and([
											eb("lucid_agent_conversations.user_id", "is", null),
											eb(
												"lucid_agent_conversations.agent_key",
												"in",
												props.agentKeys.manage,
											),
										]),
									]
								: []),
						]),
					),
				count: this.selectWithLatestRun()
					.select((eb) => eb.fn.countAll<number>().as("count"))
					.where((eb) =>
						eb.or([
							...(props.agentKeys.use.length
								? [
										eb.and([
											eb(
												"lucid_agent_conversations.user_id",
												"=",
												props.userId,
											),
											eb(
												"lucid_agent_conversations.agent_key",
												"in",
												props.agentKeys.use,
											),
										]),
									]
								: []),
							...(props.agentKeys.manage.length
								? [
										eb.and([
											eb("lucid_agent_conversations.user_id", "is", null),
											eb(
												"lucid_agent_conversations.agent_key",
												"in",
												props.agentKeys.manage,
											),
										]),
									]
								: []),
						]),
					),
			},
			{
				queryParams: props.queryParams,
				database: this.dbAdapter.config,
				meta: this.config.queryConfig,
			},
		);

		const exec = await this.executeQuery(
			() =>
				Promise.all([
					main.execute(),
					count?.executeTakeFirst() as Promise<{ count: number } | undefined>,
				]),
			{ method: "selectMultipleFilteredForAccess" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple-count",
			select: [
				"id",
				"agent_key",
				"title",
				"user_id",
				"routine_id",
				"active_run_id",
				"queue_paused",
				"context",
				"created_at",
				"updated_at",
				"latest_run_id",
				"latest_run_status",
				"latest_run_outcome",
				"latest_run_error",
			],
		});
	}
	async selectSingleWithLatestRun(props: { id: string }) {
		const exec = await this.executeQuery(
			() =>
				this.selectWithLatestRun()
					.select([
						"lucid_agent_conversations.id",
						"lucid_agent_conversations.agent_key",
						"lucid_agent_conversations.title",
						"lucid_agent_conversations.user_id",
						"lucid_agent_conversations.routine_id",
						"lucid_agent_conversations.active_run_id",
						"lucid_agent_conversations.queue_paused",
						"lucid_agent_conversations.context",
						"lucid_agent_conversations.created_at",
						"lucid_agent_conversations.updated_at",
						"lucid_agent_runs.id as latest_run_id",
						"lucid_agent_runs.status as latest_run_status",
						"lucid_agent_runs.outcome as latest_run_outcome",
						"lucid_agent_runs.error_message as latest_run_error",
					])
					.where("lucid_agent_conversations.id", "=", props.id)
					.executeTakeFirst(),
			{ method: "selectSingleWithLatestRun" },
		);

		return exec.response;
	}
	/** Claims an idle conversation; retrying the same run id can finish a partial write. */
	async claimRun(props: {
		allowPaused?: boolean;
		conversationId: string;
		runId: string;
		updatedAt: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_conversations")
					.set({ active_run_id: props.runId, updated_at: props.updatedAt })
					.where("id", "=", props.conversationId)
					.$if(props.allowPaused !== true, (q) =>
						q.where("queue_paused", "=", false),
					)
					.where((eb) =>
						eb.or([
							eb("active_run_id", "is", null),
							eb("active_run_id", "=", props.runId),
						]),
					)
					.returning("id")
					.executeTakeFirst(),
			{ method: "claimRun" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Only the conversation's active run writes its context. */
	async updateContext(props: {
		conversationId: string;
		runId: string;
		context: ConversationContext;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_conversations")
					.set({ context: props.context })
					.where("id", "=", props.conversationId)
					.where("active_run_id", "=", props.runId)
					.execute(),
			{ method: "updateContext" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: undefined };
	}
	/** A stale runner cannot release a newer run's claim. */
	async releaseRun(props: {
		conversationId: string;
		runId: string;
		updatedAt: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_conversations")
					.set({ active_run_id: null, updated_at: props.updatedAt })
					.where("id", "=", props.conversationId)
					.where("active_run_id", "=", props.runId)
					.execute(),
			{ method: "releaseRun" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: undefined };
	}
	/** Pauses automatic follow-ups; worker calls are fenced by their execution token. */
	async pauseQueue(props: {
		conversationId: string;
		runId: string;
		token?: string;
	}) {
		const result = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_conversations")
					.set({ queue_paused: true })
					.where("id", "=", props.conversationId)
					.where("active_run_id", "=", props.runId)
					.$if(props.token !== undefined, (query) =>
						query.where((eb) =>
							eb.exists(
								eb
									.selectFrom("lucid_agent_runs")
									.select("id")
									.where("id", "=", props.runId)
									.where("execution_token", "=", props.token ?? null)
									.where("status", "=", "running"),
							),
						),
					)
					.returning("id")
					.executeTakeFirst(),
			{ method: "pauseQueue" },
		);
		if (result.response.error) return result.response;

		return { error: undefined, data: result.response.data !== undefined };
	}
	/**
	 * Repairs claims left behind when a crash separates a run's write from its
	 * conversation's. Claims without a run row are only released once they are stale.
	 */
	async releaseFinishedClaims(props: {
		now: string;
		staleBefore: string;
		conversationId?: string;
	}) {
		let query = this.db
			.updateTable("lucid_agent_conversations")
			.set((eb) => ({
				active_run_id: null,
				updated_at: props.now,
				queue_paused: eb.or([
					eb("queue_paused", "=", true),
					eb.exists(
						eb
							.selectFrom("lucid_agent_runs")
							.select("id")
							.whereRef(
								"lucid_agent_runs.id",
								"=",
								"lucid_agent_conversations.active_run_id",
							)
							.where("status", "in", ["failed", "cancelled"]),
					),
				]),
			}))
			.where("active_run_id", "is not", null)
			.where((eb) => {
				const run = eb
					.selectFrom("lucid_agent_runs")
					.select("id")
					.whereRef(
						"lucid_agent_runs.id",
						"=",
						"lucid_agent_conversations.active_run_id",
					);

				return eb.or([
					eb.exists(
						run.where("status", "in", constants.agent.runStatuses.terminal),
					),
					eb.and([
						eb("updated_at", "<", props.staleBefore),
						eb.not(eb.exists(run)),
					]),
				]);
			});

		if (props.conversationId) {
			query = query.where("id", "=", props.conversationId);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "releaseFinishedClaims",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: undefined };
	}
}
