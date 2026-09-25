import constants from "../../constants/constants.js";
import {
	AgentConversationsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOwnedRun from "./helpers/get-owned-run.js";

/** Stops a run. A worker still executing it loses its token and stops at the next write. */
const cancelRun: ServiceFn<
	[{ runId: string; userId: number }],
	undefined
> = async (context, input) => {
	const run = await getOwnedRun(context, input);
	if (run.error) return run;

	const now = new Date().toISOString();
	const AgentRuns = new AgentRunsRepository(context.db);

	const cancelled = await AgentRuns.transition({
		runId: input.runId,
		from: constants.agent.runStatuses.active,
		status: "cancelled",
		now,
	});
	if (cancelled.error) return cancelled;

	const AgentConversations = new AgentConversationsRepository(context.db);

	return AgentConversations.releaseRun({
		conversationId: run.data.conversationId,
		runId: input.runId,
		updatedAt: now,
	});
};

export default cancelRun;
