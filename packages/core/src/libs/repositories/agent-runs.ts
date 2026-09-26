import { type Insertable, sql } from "kysely";
import constants from "../../constants/constants.js";
import type { QueryParams } from "../../types/query-params.js";
import type { AgentRunOutcome } from "../../types/response.js";
import type { Checkpoint } from "../agent/types.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import {
	type AgentRunStatus,
	agentRunsTable,
	type LucidAgentRuns,
} from "../db/tables/agent-runs.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentRunsRepository extends StaticRepository<"lucid_agent_runs"> {
	constructor(db: LucidDatabase) {
		super(db, agentRunsTable);
	}

	/** Concurrent retries may create the same run; preserve the first checkpoint. */
	async createOnce(data: Insertable<LucidAgentRuns>) {
		const result = await this.executeQuery(
			() =>
				this.db
					.insertInto("lucid_agent_runs")
					.values(data)
					.onConflict((conflict) =>
						conflict
							.column("id")
							.doUpdateSet({ id: data.id })
							.where(
								"lucid_agent_runs.conversation_id",
								"=",
								data.conversation_id,
							),
					)
					.returning("id")
					.executeTakeFirst(),
			{ method: "createOnce" },
		);

		return result.response;
	}
	/** A run with its conversation's agent and owner, which decide the access it needs. */
	async selectForExecution(runId: string) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_runs")
					.innerJoin(
						"lucid_agent_conversations",
						"lucid_agent_conversations.id",
						"lucid_agent_runs.conversation_id",
					)
					.select([
						"lucid_agent_runs.id",
						"lucid_agent_runs.conversation_id",
						"lucid_agent_runs.routine_id",
						"lucid_agent_runs.user_id",
						"lucid_agent_runs.status",
						"lucid_agent_runs.checkpoint",
						"lucid_agent_runs.execution_version",
						"lucid_agent_conversations.agent_key",
						"lucid_agent_conversations.user_id as conversation_user_id",
					])
					.where("lucid_agent_runs.id", "=", runId)
					.executeTakeFirst(),
			{ method: "selectForExecution" },
		);

		return exec.response;
	}
	async selectMultipleForRoutine(props: {
		routineId: string;
		queryParams: Partial<QueryParams>;
	}) {
		const { main, count } = queryBuilder.main(
			{
				main: this.db
					.selectFrom("lucid_agent_runs")
					.select([
						"id",
						"conversation_id",
						"routine_id",
						"status",
						"outcome",
						"summary",
						"error_message",
						"created_at",
						"started_at",
						"finished_at",
					])
					.where("routine_id", "=", props.routineId)
					.orderBy("created_at", "desc")
					.orderBy("id", "desc"),
				count: this.db
					.selectFrom("lucid_agent_runs")
					.select((eb) => eb.fn.countAll<number>().as("count"))
					.where("routine_id", "=", props.routineId),
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
			{ method: "selectMultipleForRoutine" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple-count",
			select: [
				"id",
				"conversation_id",
				"routine_id",
				"status",
				"outcome",
				"summary",
				"error_message",
				"created_at",
				"started_at",
				"finished_at",
			],
		});
	}
	/** The most recent run of each routine. */
	async selectLatestForRoutines(routineIds: string[]) {
		if (!routineIds.length) return { error: undefined, data: [] };

		const exec = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_runs as run")
					.select([
						"run.id",
						"run.routine_id",
						"run.conversation_id",
						"run.status",
						"run.outcome",
						"run.created_at",
					])
					.where("run.routine_id", "in", routineIds)
					.where(({ eb, selectFrom }) =>
						eb(
							"run.id",
							"=",
							selectFrom("lucid_agent_runs as latest")
								.select("latest.id")
								.whereRef("latest.routine_id", "=", "run.routine_id")
								.orderBy("latest.created_at", "desc")
								.orderBy("latest.id", "desc")
								.limit(1),
						),
					)
					.execute(),
			{ method: "selectLatestForRoutines" },
		);

		return exec.response;
	}
	/** The last summary a routine left for its next run. */
	async selectLatestSummary(routineId: string) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_runs")
					.select(["summary", "finished_at"])
					.where("routine_id", "=", routineId)
					.where("summary", "is not", null)
					.orderBy("finished_at", "desc")
					.limit(1)
					.executeTakeFirst(),
			{ method: "selectLatestSummary" },
		);

		return exec.response;
	}
	/** Waiting and interrupted runs still block the routine's next occurrence. */
	async selectActiveForRoutine(routineId: string) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_runs")
					.select("id")
					.where("routine_id", "=", routineId)
					.where("status", "in", constants.agent.runStatuses.active)
					.limit(1)
					.executeTakeFirst(),
			{ method: "selectActiveForRoutine" },
		);

		return exec.response;
	}
	/** Runs whose worker stopped: interrupted ones, and queued ones no worker picked up. */
	async selectRecoverable(props: { staleBefore: string; limit: number }) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_runs")
					.select(["id", "conversation_id", "user_id", "recoveries"])
					.where((eb) =>
						eb.or([
							eb("status", "=", "interrupted"),
							eb.and([
								eb("status", "=", "queued"),
								eb("updated_at", "<", props.staleBefore),
							]),
						]),
					)
					.orderBy("updated_at", "asc")
					.limit(props.limit)
					.execute(),
			{ method: "selectRecoverable" },
		);

		return exec.response;
	}
	/** Moves a run to a new status unless it has already finished. */
	async transition(props: {
		runId: string;
		from: readonly AgentRunStatus[];
		status: AgentRunStatus;
		errorMessage?: string;
		recovered?: boolean;
		now: string;
	}) {
		const terminal = constants.agent.runStatuses.terminal.some(
			(status) => status === props.status,
		);

		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_runs")
					.set({
						status: props.status,
						execution_token: null,
						lease_expires_at: null,
						updated_at: props.now,
						...(props.errorMessage !== undefined
							? { error_message: props.errorMessage }
							: {}),
						...(props.recovered
							? { recoveries: sql<number>`recoveries + 1` }
							: {}),
						...(terminal ? { finished_at: props.now } : {}),
					})
					.where("id", "=", props.runId)
					.where("status", "in", props.from)
					.returning("id")
					.executeTakeFirst(),
			{ method: "transition" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Execution token fences a resumed or crashed worker from later writes. */
	async claimExecution(props: {
		runId: string;
		token: string;
		expectedVersion: number;
		now: string;
		leaseExpiresAt: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_runs")
					.set({
						status: "running",
						execution_token: props.token,
						execution_version: sql<number>`execution_version + 1`,
						lease_expires_at: props.leaseExpiresAt,
						started_at: sql`coalesce(started_at, ${props.now})`,
						updated_at: props.now,
					})
					.where("id", "=", props.runId)
					.where("execution_version", "=", props.expectedVersion)
					.where((eb) =>
						eb.or([
							eb("status", "in", ["queued", "waiting", "interrupted"]),
							eb.and([
								eb("status", "=", "running"),
								eb("lease_expires_at", "<", props.now),
							]),
						]),
					)
					.returning("id")
					.executeTakeFirst(),
			{ method: "claimExecution" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	async heartbeatExecution(props: {
		runId: string;
		token: string;
		leaseExpiresAt: string;
		now: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_runs")
					.set({
						lease_expires_at: props.leaseExpiresAt,
						updated_at: props.now,
					})
					.where("id", "=", props.runId)
					.where("execution_token", "=", props.token)
					.where("status", "=", "running")
					.returning("id")
					.executeTakeFirst(),
			{ method: "heartbeatExecution" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Saves progress, or moves the run on, only while this worker holds its token. */
	async updateWithToken(props: {
		runId: string;
		token: string;
		checkpoint: Checkpoint;
		status: AgentRunStatus;
		errorMessage?: string | null;
		finish?: { outcome: AgentRunOutcome; summary: string };
		now: string;
	}) {
		const terminal = constants.agent.runStatuses.terminal.some(
			(status) => status === props.status,
		);
		const released = props.status !== "running";

		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_runs")
					.set({
						status: props.status,
						checkpoint: props.checkpoint,
						updated_at: props.now,
						...(props.errorMessage !== undefined
							? { error_message: props.errorMessage }
							: {}),
						...(props.finish
							? { outcome: props.finish.outcome, summary: props.finish.summary }
							: {}),
						...(terminal ? { finished_at: props.now } : {}),
						...(released
							? { lease_expires_at: null, execution_token: null }
							: {}),
					})
					.where("id", "=", props.runId)
					.where("execution_token", "=", props.token)
					.returning("id")
					.executeTakeFirst(),
			{ method: "updateWithToken" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	async interruptExpired(props: { now: string }) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_runs")
					.set({
						status: "interrupted",
						execution_token: null,
						lease_expires_at: null,
						updated_at: props.now,
					})
					.where("status", "=", "running")
					.where("lease_expires_at", "<", props.now)
					.execute(),
			{ method: "interruptExpired" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: undefined };
	}
}
