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
	/** Lists a user's conversations with their latest run. */
	async selectMultipleFilteredForUser(props: {
		userId: number;
		queryParams: Partial<QueryParams>;
	}) {
		const exec = await this.executeQuery(
			async () => {
				const { main, count } = queryBuilder.main(
					{
						main: this.selectWithLatestRun()
							.select([
								"lucid_agent_conversations.id",
								"lucid_agent_conversations.title",
								"lucid_agent_conversations.user_id",
								"lucid_agent_conversations.routine_id",
								"lucid_agent_conversations.active_run_id",
								"lucid_agent_conversations.context",
								"lucid_agent_conversations.created_at",
								"lucid_agent_conversations.updated_at",
								"lucid_agent_runs.id as latest_run_id",
								"lucid_agent_runs.status as latest_run_status",
								"lucid_agent_runs.outcome as latest_run_outcome",
								"lucid_agent_runs.error_message as latest_run_error",
							])
							.where("lucid_agent_conversations.user_id", "=", props.userId),
						count: this.selectWithLatestRun()
							.select((eb) => eb.fn.countAll<number>().as("count"))
							.where("lucid_agent_conversations.user_id", "=", props.userId),
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: this.config.queryConfig,
					},
				);

				return Promise.all([
					main.execute(),
					count?.executeTakeFirst() as Promise<{ count: number } | undefined>,
				]);
			},
			{ method: "selectMultipleFilteredForUser" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple-count",
			select: [
				"id",
				"title",
				"user_id",
				"routine_id",
				"active_run_id",
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
	async selectSingleForUser(props: { id: string; userId: number }) {
		const exec = await this.executeQuery(
			() =>
				this.selectWithLatestRun()
					.select([
						"lucid_agent_conversations.id",
						"lucid_agent_conversations.title",
						"lucid_agent_conversations.user_id",
						"lucid_agent_conversations.routine_id",
						"lucid_agent_conversations.active_run_id",
						"lucid_agent_conversations.context",
						"lucid_agent_conversations.created_at",
						"lucid_agent_conversations.updated_at",
						"lucid_agent_runs.id as latest_run_id",
						"lucid_agent_runs.status as latest_run_status",
						"lucid_agent_runs.outcome as latest_run_outcome",
						"lucid_agent_runs.error_message as latest_run_error",
					])
					.where("lucid_agent_conversations.id", "=", props.id)
					.where("lucid_agent_conversations.user_id", "=", props.userId)
					.executeTakeFirst(),
			{ method: "selectSingleForUser" },
		);

		return exec.response;
	}
	/** Claims an idle conversation; retrying the same run id can finish a partial write. */
	async claimRun(props: {
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
			.set({ active_run_id: null, updated_at: props.now })
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
