import type { LucidAgentRoutines } from "../../../libs/db/tables/agent-routines.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentRoutinesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess from "./check-agent-access.js";

/** Routines are private to the user who created them. Code routines are shared with the agent's managers. */
const getAccessibleRoutine: ServiceFn<
	[{ id: string; userId: number }],
	Select<LucidAgentRoutines>
> = async (context, input) => {
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const result = await AgentRoutines.selectSingle({
		select: [
			"id",
			"agent_key",
			"key",
			"source",
			"name",
			"instructions",
			"cron",
			"timezone",
			"enabled",
			"user_id",
			"next_run_at",
			"created_at",
			"updated_at",
		],
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (result.error) return result;
	if (
		!result.data ||
		(result.data.source === "database" && result.data.user_id !== input.userId)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.routine.not.found"),
			},
		};
	}

	const access = await checkAgentAccess(context, {
		userId: input.userId,
		agentKey: result.data.agent_key,
		level: result.data.source === "code" ? "manage" : "use",
	});
	if (access.error) return access;

	return { error: undefined, data: result.data };
};

export default getAccessibleRoutine;
