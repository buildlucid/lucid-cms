import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentRunsRepository,
	AiGenerationsRepository,
} from "../../libs/repositories/index.js";
import type { GetRoutineRunsQueryParams } from "../../schemas/agent.js";
import type { AgentRun, AgentUsage } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";

const getRoutineRuns: ServiceFn<
	[{ id: string; userId: number; query: GetRoutineRunsQueryParams }],
	{ data: AgentRun[]; count: number }
> = async (context, input) => {
	const routine = await getAccessibleRoutine(context, input);
	if (routine.error) return routine;

	const AgentRuns = new AgentRunsRepository(context.db);

	const runs = await AgentRuns.selectMultipleForRoutine({
		routineId: input.id,
		queryParams: input.query,
	});
	if (runs.error) return runs;

	const AiGenerations = new AiGenerationsRepository(context.db);

	const usage = await AiGenerations.usageByRuns(
		runs.data[0].map((run) => run.id),
	);
	if (usage.error) return usage;

	const totals = new Map<string | null, AgentUsage>(
		usage.data.map((row) => [
			row.agent_run_id,
			{
				credits: Number(row.credits ?? 0),
				modelCalls: Number(row.model_calls),
			},
		]),
	);

	return {
		error: undefined,
		data: {
			data: runs.data[0].map((run) =>
				agentFormatter.formatRun({ run, usage: totals.get(run.id) }),
			),
			count: formatter.parseCount(runs.data[1]?.count),
		},
	};
};

export default getRoutineRuns;
