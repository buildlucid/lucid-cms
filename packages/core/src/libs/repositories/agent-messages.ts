import { sql } from "kysely";
import type { AgentMessagePart } from "../../types/response.js";
import type { LucidDatabase } from "../db/client/index.js";
import { agentMessagesTable } from "../db/tables/agent-messages.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentMessagesRepository extends StaticRepository<"lucid_agent_messages"> {
	constructor(db: LucidDatabase) {
		super(db, agentMessagesTable);
	}

	private nextPosition(conversationId: string) {
		return sql<number>`(select coalesce(max(position), 0) + 1 from lucid_agent_messages where conversation_id = ${conversationId})`;
	}
	/** Writes the assistant message a run is producing. Only the current running worker can insert or update it. */
	async upsertForRun(props: {
		id: string;
		conversationId: string;
		runId: string;
		token: string;
		parts: AgentMessagePart[];
		now: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.insertInto("lucid_agent_messages")
					.columns([
						"id",
						"conversation_id",
						"run_id",
						"role",
						"parts",
						"created_at",
						"updated_at",
						"position",
					])
					.expression((eb) =>
						eb
							.selectFrom("lucid_agent_runs")
							.select([
								eb.val(props.id).as("id"),
								eb.val(props.conversationId).as("conversation_id"),
								eb.val(props.runId).as("run_id"),
								eb.val("assistant").as("role"),
								sql<AgentMessagePart[]>`${JSON.stringify(props.parts)}`.as(
									"parts",
								),
								eb.val(props.now).as("created_at"),
								eb.val(props.now).as("updated_at"),
								this.nextPosition(props.conversationId).as("position"),
							])
							.where("id", "=", props.runId)
							.where("conversation_id", "=", props.conversationId)
							.where("execution_token", "=", props.token)
							.where("status", "=", "running"),
					)
					.onConflict((conflict) =>
						conflict.column("id").doUpdateSet((eb) => ({
							parts: eb.ref("excluded.parts"),
							updated_at: eb.ref("excluded.updated_at"),
						})),
					)
					.returning("id")
					.execute(),
			{ method: "upsertForRun" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data.length > 0 };
	}
	/** Retried requests may write the same message id; only the first insert wins. */
	async appendOnce(data: {
		id: string;
		conversationId: string;
		runId: string;
		parts: AgentMessagePart[];
		createdAt: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.insertInto("lucid_agent_messages")
					.values({
						id: data.id,
						conversation_id: data.conversationId,
						run_id: data.runId,
						role: "user",
						parts: data.parts,
						created_at: data.createdAt,
						updated_at: data.createdAt,
						position: this.nextPosition(data.conversationId),
					})
					.onConflict((conflict) => conflict.column("id").doNothing())
					.execute(),
			{ method: "appendOnce" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: undefined };
	}
	/** Returns the latest messages, optionally before a position, newest first. */
	async selectLatest(props: {
		conversationId: string;
		before?: number;
		limit: number;
	}) {
		let query = this.db
			.selectFrom("lucid_agent_messages")
			.selectAll()
			.where("conversation_id", "=", props.conversationId)
			.orderBy("position", "desc")
			.limit(props.limit);

		if (props.before !== undefined) {
			query = query.where("position", "<", props.before);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectLatest",
		});

		return exec.response;
	}
	/** Reads history in bounded pages, including messages no longer in model context. */
	async selectAfter(props: {
		conversationId: string;
		after: number;
		limit: number;
	}) {
		const result = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_messages")
					.selectAll()
					.where("conversation_id", "=", props.conversationId)
					.where("position", ">", props.after)
					.orderBy("position", "asc")
					.limit(props.limit)
					.execute(),
			{ method: "selectAfter" },
		);
		return result.response;
	}
	/** A run's assistant messages changed at or after a time, in order. */
	async selectChangedForRun(props: { runId: string; since?: string }) {
		let query = this.db
			.selectFrom("lucid_agent_messages")
			.selectAll()
			.where("run_id", "=", props.runId)
			.where("role", "=", "assistant")
			.orderBy("position", "asc");

		if (props.since !== undefined) {
			query = query.where("updated_at", ">=", props.since);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectChangedForRun",
		});

		return exec.response;
	}
}
