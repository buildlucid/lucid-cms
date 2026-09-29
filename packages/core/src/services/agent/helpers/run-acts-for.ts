import { AgentRunsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Whether a run acts for this user. A run only takes corrections from the person it acts for. */
const runActsFor: ServiceFn<
	[{ runId: string; userId: number }],
	boolean
> = async (context, input) => {
	const Runs = new AgentRunsRepository(context.db);

	const run = await Runs.selectSingle({
		select: ["user_id"],
		where: [{ key: "id", operator: "=", value: input.runId }],
	});
	if (run.error) return run;

	return { error: undefined, data: run.data?.user_id === input.userId };
};

export default runActsFor;
