import type { AgentRunStatus } from "../../types/response.js";
import type { LucidDatabase } from "../db/client/index.js";
import {
	agentRoutinePendingTable,
	type LucidAgentRoutinePending,
} from "../db/tables/agent-routine-pending.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentRoutinePendingRepository extends StaticRepository<"lucid_agent_routine_pending"> {
	constructor(db: LucidDatabase) {
		super(db, agentRoutinePendingTable);
	}

	/** Queues events per routine and subject, updating `last_at` and caller-merged `fields` on repeats. */
	async record(props: {
		event: LucidAgentRoutinePending["event"];
		rows: {
			routineId: string;
			subject: Pick<
				LucidAgentRoutinePending,
				"subject_type" | "subject_id" | "collection_key" | "subject_key"
			>;
			fields: string[];
		}[];
		now: string;
	}) {
		const query = this.db
			.insertInto("lucid_agent_routine_pending")
			.values(
				props.rows.map((row) => ({
					id: crypto.randomUUID(),
					routine_id: row.routineId,
					event: props.event,
					subject_type: row.subject.subject_type,
					subject_id: row.subject.subject_id,
					collection_key: row.subject.collection_key,
					subject_key: row.subject.subject_key,
					fields: row.fields,
					first_at: props.now,
					last_at: props.now,
				})),
			)
			.onConflict((conflict) =>
				conflict
					.columns(["routine_id", "event", "subject_key"])
					.doUpdateSet((eb) => ({
						last_at: eb.ref("excluded.last_at"),
						fields: eb.ref("excluded.fields"),
					})),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "record",
		});

		return exec.response;
	}
	/** Finds enabled routines whose quiet period or maximum wait threshold has elapsed. */
	async selectReady(props: {
		quietBefore: string;
		waitedBefore: string;
		activeStatuses: readonly AgentRunStatus[];
		limit: number;
	}) {
		const query = this.db
			.selectFrom("lucid_agent_routine_pending")
			.innerJoin(
				"lucid_agent_routines",
				"lucid_agent_routines.id",
				"lucid_agent_routine_pending.routine_id",
			)
			.select([
				"lucid_agent_routines.id",
				"lucid_agent_routines.agent_key",
				"lucid_agent_routines.user_id",
			])
			.where(
				"lucid_agent_routines.enabled",
				"=",
				this.dbAdapter.getDefault("boolean", "true"),
			)
			//* exclude routines with active runs before limiting the batch
			.where((eb) =>
				eb.not(
					eb.exists(
						eb
							.selectFrom("lucid_agent_runs")
							.select("lucid_agent_runs.id")
							.whereRef(
								"lucid_agent_runs.routine_id",
								"=",
								"lucid_agent_routines.id",
							)
							.where("lucid_agent_runs.status", "in", props.activeStatuses),
					),
				),
			)
			.groupBy([
				"lucid_agent_routines.id",
				"lucid_agent_routines.agent_key",
				"lucid_agent_routines.user_id",
			])
			.having((eb) =>
				eb.or([
					eb(
						eb.fn.max("lucid_agent_routine_pending.last_at"),
						"<=",
						props.quietBefore,
					),
					eb(
						eb.fn.min("lucid_agent_routine_pending.first_at"),
						"<=",
						props.waitedBefore,
					),
				]),
			)
			.orderBy((eb) => eb.fn.min("lucid_agent_routine_pending.first_at"))
			.limit(props.limit);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectReady",
		});

		return exec.response;
	}
	/** Drops expired changes, including those left while an agent was unavailable. */
	async deleteExpired(props: { before: string }) {
		const query = this.db
			.deleteFrom("lucid_agent_routine_pending")
			.where("first_at", "<", props.before);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "deleteExpired",
		});

		return exec.response;
	}
}
