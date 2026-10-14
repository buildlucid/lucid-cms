import type { LucidDatabase } from "../db/client/index.js";
import { agentMemoriesTable } from "../db/tables/agent-memories.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentMemoriesRepository extends StaticRepository<"lucid_agent_memories"> {
	constructor(db: LucidDatabase) {
		super(db, agentMemoriesTable);
	}

	/** Lists selected shared and personal memories oldest first to keep new entries at the prompt's end. */
	async selectMultipleForPerson(props: {
		/** Null excludes personal memories, eg. for runs acting as the system. */
		userId: number | null;
		shared: boolean;
		personal: boolean;
	}) {
		const { userId } = props;
		const query = this.db
			.selectFrom("lucid_agent_memories")
			.select([
				"id",
				"owner_user_id",
				"content",
				"created_by",
				"created_by_run_id",
				"updated_by",
				"updated_by_run_id",
				"created_at",
				"updated_at",
			])
			.where((eb) =>
				eb.or([
					...(props.shared ? [eb("owner_user_id", "is", null)] : []),
					...(props.personal && userId !== null
						? [eb("owner_user_id", "=", userId)]
						: []),
				]),
			)
			.orderBy("created_at")
			.orderBy("id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleForPerson",
		});

		return exec.response;
	}
}
