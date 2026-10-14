import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentRunsRepository } from "../../libs/repositories/index.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDisplayUsers from "../users/helpers/get-display-users.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import getRoutineTools from "./helpers/get-routine-tools.js";

/** Gets a routine the person can access, with its tool settings and last run. */
const getRoutine: ServiceFn<
	[{ id: string; userId: number }],
	AgentRoutine
> = async (context, input) => {
	const routine = await getAccessibleRoutine(context, input);
	if (routine.error) return routine;

	const AgentRuns = new AgentRunsRepository(context.db);

	const lastRuns = await AgentRuns.selectLatestForRoutines([input.id]);
	if (lastRuns.error) return lastRuns;

	const tools = await getRoutineTools(context, [input.id]);
	if (tools.error) return tools;

	const owners = await getDisplayUsers(context, {
		ids: [routine.data.user_id],
	});
	if (owners.error) return owners;

	return {
		error: undefined,
		data: agentFormatter.formatRoutine({
			routine: routine.data,
			access: routine.data.access,
			toolSettings: tools.data[input.id] ?? {},
			lastRun: lastRuns.data[0],
			owner:
				routine.data.user_id === null
					? undefined
					: owners.data.get(routine.data.user_id),
		}),
	};
};

export default getRoutine;
