import constants from "../../constants/constants.js";
import logger from "../../libs/logger/index.js";
import { AgentRunsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import enqueueRun from "./helpers/enqueue-run.js";
import isSubagentWaitOver from "./helpers/subagents/is-subagent-wait-over.js";

/** Resumes runs whose sub-agent wait is over, catching any a finishing sub-agent missed. Returns how many were queued. */
const resumeSubagentWaits: ServiceFn<[], number> = async (context) => {
	const Runs = new AgentRunsRepository(context.db);

	let resumed = 0;
	let after: string | undefined;

	//* every wait is checked each tick, so waits that stay blocked can't crowd out ones that are over
	while (true) {
		const waiting = await Runs.selectWaitingForSubagents({
			after,
			limit: constants.agent.batchSize,
		});
		if (waiting.error) return waiting;

		//* a run that fails here is retried on the next tick without holding up the others
		for (const run of waiting.data) {
			const over = await isSubagentWaitOver(context, {
				conversationId: run.conversation_id,
				checkpoint: run.checkpoint,
			});
			if (over.error) {
				logger.error({
					error: over.error,
					message: "Agent run's sub-agent wait could not be checked",
					scope: constants.logScopes.ai,
					data: { runId: run.id },
				});
				continue;
			}
			if (!over.data) continue;

			const queued = await enqueueRun(context, {
				runId: run.id,
				userId: run.user_id,
			});
			if (queued.error) {
				logger.error({
					error: queued.error,
					message: "Agent run could not be resumed after its sub-agent wait",
					scope: constants.logScopes.ai,
					data: { runId: run.id },
				});
				continue;
			}

			resumed++;
		}

		after = waiting.data.at(-1)?.id;
		if (waiting.data.length < constants.agent.batchSize || !after) break;
	}

	return { error: undefined, data: resumed };
};

export default resumeSubagentWaits;
