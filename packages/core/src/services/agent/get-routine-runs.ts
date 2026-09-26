import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentRunsRepository,
	AiGenerationsRepository,
} from "../../libs/repositories/index.js";
import type { GetRoutineRunsQueryParams } from "../../schemas/agent.js";
import type { AgentRun, AgentUsage } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import sumCredits from "./helpers/sum-credits.js";

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

	const usage = await AiGenerations.agentUsageByRuns(
		runs.data[0].map((run) => run.id),
	);
	if (usage.error) return usage;

	const totals = new Map<string, AgentUsage>();

	for (const row of usage.data) {
		if (!row.agent_run_id) continue;

		const total = totals.get(row.agent_run_id);
		const calls = Number(row.model_calls);
		totals.set(row.agent_run_id, {
			creditsCharged: sumCredits(
				total?.creditsCharged ?? "0",
				row.credits_charged ?? "0",
				calls,
			),
			modelCalls: (total?.modelCalls ?? 0) + calls,
		});
	}

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
