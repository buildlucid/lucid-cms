import type { LucidDatabase } from "../db/client/index.js";
import { agentAttributionsTable } from "../db/tables/agent-attributions.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentAttributionsRepository extends StaticRepository<"lucid_agent_attributions"> {
	constructor(db: LucidDatabase) {
		super(db, agentAttributionsTable);
	}

	/** Retried run starts record the same attribution, so a repeat is ignored. */
	async createOnce(props: {
		runId: string;
		agentKey: string;
		system: boolean;
		conversationId: string;
	}) {
		const query = this.db
			.insertInto("lucid_agent_attributions")
			.values({
				run_id: props.runId,
				agent_key: props.agentKey,
				system: props.system,
				conversation_id: props.conversationId,
			})
			.onConflict((conflict) => conflict.column("run_id").doNothing());

		const exec = await this.executeQuery(() => query.execute(), {
			method: "createOnce",
		});

		return exec.response;
	}
	async selectMultipleByRun(runIds: string[]) {
		const query = this.db
			.selectFrom("lucid_agent_attributions")
			.select(["run_id", "agent_key", "system", "conversation_id"])
			.where("run_id", "in", runIds);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleByRun",
		});

		return exec.response;
	}
}
