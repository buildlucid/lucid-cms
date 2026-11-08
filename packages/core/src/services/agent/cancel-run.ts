import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleRun from "./helpers/get-accessible-run.js";
import stopRun from "./helpers/stop-run.js";
import stopSubagents from "./helpers/subagents/stop-subagents.js";

/** Stops a run, and the sub-agents its chat still has working. A worker still executing it loses its token and stops at the next write. */
const cancelRun: ServiceFn<
	[{ runId: string; userId: number }],
	undefined
> = async (context, input) => {
	const run = await getAccessibleRun(context, input);
	if (run.error) return run;

	const stopped = await stopRun(context, {
		runId: input.runId,
		conversationId: run.data.conversationId,
		tellParent: true,
	});
	if (stopped.error) return stopped;
	//* a stale stop for a run that already ended leaves a newer run's sub-agents alone
	if (!stopped.data) return { error: undefined, data: undefined };

	return stopSubagents(context, { conversationId: run.data.conversationId });
};

export default cancelRun;
