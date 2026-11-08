import { copy } from "../../../../libs/i18n/index.js";
import { AgentRunsRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/**
 * Locks and checks the parent before sub-agent writes.
 * @remarks Call first in the write transaction to serialize against cancellation.
 */
const checkParentRunning: ServiceFn<[{ runId: string }], undefined> = async (
	context,
	input,
) => {
	const Runs = new AgentRunsRepository(context.db);

	const running = await Runs.lockRunning(input.runId);
	if (running.error) return running;
	if (!running.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.subagent.parent.stopped"),
			},
		};
	}

	return { error: undefined, data: undefined };
};

export default checkParentRunning;
