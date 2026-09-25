import type { LucidAgentRoutines } from "../../../libs/db/tables/agent-routines.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentRoutinesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Routines are private to the user who created them and run with their permissions. */
const getOwnedRoutine: ServiceFn<
	[{ id: string; userId: number }],
	Select<LucidAgentRoutines>
> = async (context, input) => {
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const result = await AgentRoutines.selectSingle({
		select: [
			"id",
			"title",
			"instructions",
			"cron",
			"timezone",
			"enabled",
			"user_id",
			"next_run_at",
			"created_at",
			"updated_at",
		],
		where: [
			{ key: "id", operator: "=", value: input.id },
			{ key: "user_id", operator: "=", value: input.userId },
		],
	});
	if (result.error) return result;
	if (!result.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.routine.not.found"),
			},
		};
	}

	return { error: undefined, data: result.data };
};

export default getOwnedRoutine;
