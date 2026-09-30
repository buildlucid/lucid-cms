import { sql } from "kysely";
import type { StoredAgentMessagePart } from "../../schemas/agent.js";
import type { SavedMessageCursor } from "../agent/run-stream.js";
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
	/** Writes a run's message. Only its current worker can insert or update it. */
	async upsertForRun(props: {
		role?: "user" | "assistant";
		id: string;
		conversationId: string;
		runId: string;
		token: string;
		executionVersion: number;
		revision: number;
		parts: StoredAgentMessagePart[];
		now: string;
	}) {
		const query = this.db
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
				"execution_version",
				"revision",
			])
			.expression((eb) =>
				eb
					.selectFrom("lucid_agent_runs")
					.select([
						eb.val(props.id).as("id"),
						eb.val(props.conversationId).as("conversation_id"),
						eb.val(props.runId).as("run_id"),
						eb.val(props.role ?? "assistant").as("role"),
						sql<StoredAgentMessagePart[]>`${JSON.stringify(props.parts)}`.as(
							"parts",
						),
						eb.val(props.now).as("created_at"),
						eb.val(props.now).as("updated_at"),
						this.nextPosition(props.conversationId).as("position"),
						eb.val(props.executionVersion).as("execution_version"),
						eb.val(props.revision).as("revision"),
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
					execution_version: eb.ref("excluded.execution_version"),
					revision: eb.ref("excluded.revision"),
				})),
			)
			.returning("id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "upsertForRun",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data.length > 0 };
	}
	/** Retried requests may write the same message id; only the first insert wins. Returns whether this call inserted it. */
	async appendOnce(data: {
		id: string;
		conversationId: string;
		runId: string;
		parts: StoredAgentMessagePart[];
		createdAt: string;
	}) {
		const query = this.db
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
			.returning("id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "appendOnce",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data.length > 0 };
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
	/** Routine run requests after a position, newest first. */
	async selectRoutineRequests(props: {
		conversationId: string;
		after: number;
	}) {
		const query = this.db
			.selectFrom("lucid_agent_messages")
			.innerJoin(
				"lucid_agent_runs",
				"lucid_agent_runs.id",
				"lucid_agent_messages.run_id",
			)
			.select(["lucid_agent_messages.parts"])
			.where("lucid_agent_messages.conversation_id", "=", props.conversationId)
			.where("lucid_agent_messages.role", "=", "user")
			.where("lucid_agent_messages.position", ">", props.after)
			.where("lucid_agent_runs.routine_id", "is not", null)
			.orderBy("lucid_agent_messages.position", "desc");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectRoutineRequests",
		});

		return exec.response;
	}
	/** Reads history in bounded pages, including messages no longer in model context. */
	async selectAfter(props: {
		conversationId: string;
		after: number;
		limit: number;
	}) {
		const query = this.db
			.selectFrom("lucid_agent_messages")
			.selectAll()
			.where("conversation_id", "=", props.conversationId)
			.where("position", ">", props.after)
			.orderBy("position", "asc")
			.limit(props.limit);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectAfter",
		});

		return exec.response;
	}
	/** A run's saved messages after a cursor, independent of clock resolution. */
	async selectChangedForRun(props: {
		runId: string;
		cursor?: SavedMessageCursor;
	}) {
		const { cursor } = props;
		let query = this.db
			.selectFrom("lucid_agent_messages")
			.selectAll()
			.where("run_id", "=", props.runId)
			.orderBy("execution_version", "asc")
			.orderBy("revision", "asc")
			.orderBy("position", "asc");

		if (cursor !== undefined) {
			query = query.where((eb) =>
				eb.or([
					eb("execution_version", ">", cursor.executionVersion),
					eb.and([
						eb("execution_version", "=", cursor.executionVersion),
						eb("revision", ">", cursor.revision),
					]),
				]),
			);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectChangedForRun",
		});

		return exec.response;
	}
	/** Checks a small indexed record before loading changed message payloads. */
	async selectRunVersion(runId: string) {
		const query = this.db
			.selectFrom("lucid_agent_messages")
			.select(["execution_version", "revision"])
			.where("run_id", "=", runId)
			.orderBy("execution_version", "desc")
			.orderBy("revision", "desc")
			.limit(1);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectRunVersion",
		});

		return exec.response;
	}
}
