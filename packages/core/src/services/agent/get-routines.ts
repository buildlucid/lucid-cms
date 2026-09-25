import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { GetMultipleRoutinesQueryParams } from "../../schemas/agent.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getRoutines: ServiceFn<
	[{ userId: number; query: GetMultipleRoutinesQueryParams }],
	{ data: AgentRoutine[]; count: number }
> = async (context, input) => {
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const routines = await AgentRoutines.selectMultipleFiltered({
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
		where: [{ key: "user_id", operator: "=", value: input.userId }],
		queryParams: input.query,
		validation: { enabled: true },
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
