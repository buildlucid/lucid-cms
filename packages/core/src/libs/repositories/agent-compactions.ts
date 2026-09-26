import { sql } from "kysely";
import type { LucidDatabase } from "../db/client/index.js";
import { agentCompactionsTable } from "../db/tables/agent-compactions.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentCompactionsRepository extends StaticRepository<"lucid_agent_compactions"> {
	constructor(db: LucidDatabase) {
		super(db, agentCompactionsTable);
	}

	/** A saved result can be replayed after interruption, including on databases without transactions. */
	async storeForRun(props: {
		id: string;
		conversationId: string;
		runId: string;
		token: string;
		summary: string;
		throughPosition: number;
	}) {
		const result = await this.executeQuery(
			() =>
				this.db
					.insertInto("lucid_agent_compactions")
					.columns([
						"id",
						"conversation_id",
						"run_id",
						"summary",
						"through_position",
						"created_at",
					])
					.expression((eb) =>
						eb
							.selectFrom("lucid_agent_runs")
							.select([
								eb.val(props.id).as("id"),
								eb.val(props.conversationId).as("conversation_id"),
								eb.val(props.runId).as("run_id"),
								eb.val(props.summary).as("summary"),
								eb.val(props.throughPosition).as("through_position"),
								eb.val(new Date().toISOString()).as("created_at"),
							])
							.where("id", "=", props.runId)
							.where("conversation_id", "=", props.conversationId)
							.where("execution_token", "=", props.token)
							.where("status", "=", "running"),
					)
					.onConflict((conflict) =>
						conflict.column("id").doUpdateSet({ id: sql`excluded.id` }),
					)
					.returning("id")
					.executeTakeFirst(),
			{ method: "storeForRun" },
		);
		if (result.response.error) return result.response;

		return { error: undefined, data: result.response.data !== undefined };
	}
	/** Oldest first, for marking where the chat was compacted. */
	async selectForConversation(conversationId: string) {
		const result = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_compactions")
					.select(["id", "created_at"])
					.where("conversation_id", "=", conversationId)
					.orderBy("created_at", "asc")
					.execute(),
			{ method: "selectForConversation" },
		);

		return result.response;
	}
	async selectLatest(conversationId: string) {
		const result = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_compactions")
					.selectAll()
					.where("conversation_id", "=", conversationId)
					.orderBy("through_position", "desc")
					.orderBy("created_at", "desc")
					.limit(1)
					.executeTakeFirst(),
			{ method: "selectLatest" },
		);

		return result.response;
	}
}
