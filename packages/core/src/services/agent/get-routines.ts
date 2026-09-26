import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { GetMultipleRoutinesQueryParams } from "../../schemas/agent.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveAgentAccess from "./helpers/resolve-agent-access.js";

const getRoutines: ServiceFn<
	[{ userId: number; query: GetMultipleRoutinesQueryParams }],
	{ data: AgentRoutine[]; count: number }
> = async (context, input) => {
	const access = await resolveAgentAccess(context, { userId: input.userId });
	if (access.error) return access;

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const routines = await AgentRoutines.selectMultipleFilteredForAccess({
		userId: input.userId,
		agentKeys: access.data,
		queryParams: input.query,
	});
	if (routines.error) return routines;

	const AgentRuns = new AgentRunsRepository(context.db);

	const lastRuns = await AgentRuns.selectLatestForRoutines(
		routines.data[0].map((routine) => routine.id),
	);
	if (lastRuns.error) return lastRuns;

	return {
		error: undefined,
		data: {
			data: routines.data[0].map((routine) =>
				agentFormatter.formatRoutine({
					routine,
					lastRun: lastRuns.data.find((run) => run.routine_id === routine.id),
				}),
			),
			count: formatter.parseCount(routines.data[1]?.count),
		},
	};
};

export default getRoutines;
