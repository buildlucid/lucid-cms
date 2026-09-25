import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentRunsRepository } from "../../libs/repositories/index.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOwnedRoutine from "./helpers/get-owned-routine.js";

const getRoutine: ServiceFn<
	[{ id: string; userId: number }],
	AgentRoutine
> = async (context, input) => {
	const routine = await getOwnedRoutine(context, input);
	if (routine.error) return routine;

	const AgentRuns = new AgentRunsRepository(context.db);

	const lastRuns = await AgentRuns.selectLatestForRoutines([input.id]);
	if (lastRuns.error) return lastRuns;

	return {
		error: undefined,
		data: agentFormatter.formatRoutine({
			routine: routine.data,
			lastRun: lastRuns.data[0],
		}),
	};
};

export default getRoutine;
