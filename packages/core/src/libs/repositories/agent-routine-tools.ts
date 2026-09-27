import type { LucidDatabase } from "../db/client/index.js";
import { agentRoutineToolsTable } from "../db/tables/agent-routine-tools.js";
import StaticRepository from "./parents/static-repository.js";

export default class AgentRoutineToolsRepository extends StaticRepository<"lucid_agent_routine_tools"> {
	constructor(db: LucidDatabase) {
		super(db, agentRoutineToolsTable);
	}
}
