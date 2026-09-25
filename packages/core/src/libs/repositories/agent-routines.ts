import type { LucidDatabase } from "../db/client/index.js";
import { agentRoutinesTable } from "../db/tables/agent-routines.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentRoutinesRepository extends StaticRepository<"lucid_agent_routines"> {
	constructor(db: LucidDatabase) {
		super(db, agentRoutinesTable);
	}

	async selectDue(props: { now: string; limit: number }) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_routines")
					.selectAll()
					.where("enabled", "=", this.dbAdapter.getDefault("boolean", "true"))
					.where("next_run_at", "<=", props.now)
					.orderBy("next_run_at", "asc")
					.limit(props.limit)
					.execute(),
			{ method: "selectDue" },
		);

		return exec.response;
	}
	/** Advances a due occurrence. Only one scheduler can claim it. */
	async claimOccurrence(props: {
		id: string;
		expectedNextRunAt: string;
		nextRunAt: string;
		now: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_routines")
					.set({ next_run_at: props.nextRunAt, updated_at: props.now })
					.where("id", "=", props.id)
					.where("next_run_at", "=", props.expectedNextRunAt)
					.returning("id")
					.executeTakeFirst(),
			{ method: "claimOccurrence" },
		);
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
}
