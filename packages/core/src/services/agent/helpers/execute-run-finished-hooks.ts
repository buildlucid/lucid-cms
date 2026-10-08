import constants from "../../../constants/constants.js";
import { isTerminalRunStatus } from "../../../libs/agent/run-status.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import logger from "../../../libs/logger/index.js";
import { AgentRunsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";

/**
 * Runs `agent.runFinished` hooks for a run that has stopped for good. Call in
 * the transaction that finishes the run. Hooks that fail are logged and rolled
 * back on their own, so they never stop the run finishing.
 */
const executeRunFinishedHooks: ServiceFn<
	[{ runId: string }],
	undefined
> = async (context, data) => {
	if (!context.config.hooks.some((hook) => hook.service === "agent")) {
		return { error: undefined, data: undefined };
	}

	try {
		const executed = await withTransaction(
			context,
			async (context) => {
				const AgentRuns = new AgentRunsRepository(context.db);

				const runRes = await AgentRuns.selectFinished(data.runId);
				if (runRes.error) return runRes;

				const run = runRes.data;
				if (!run || !isTerminalRunStatus(run.status)) {
					return { error: undefined, data: undefined };
				}

				return executeHooks(
					context,
					{ service: "agent", event: "runFinished", config: context.config },
					{
						meta: { userId: run.user_id },
						data: {
							runId: run.id,
							conversationId: run.conversation_id,
							agentKey: run.agent_key,
							routineId: run.routine_id,
							status: run.status,
							result:
								run.status === "completed" &&
								run.outcome &&
								run.summary !== null
									? { outcome: run.outcome, summary: run.summary }
									: null,
							errorMessage: run.error_message,
						},
					},
				);
			},
			{ isolate: true },
		);
		if (executed.error) {
			logger.error({
				error: executed.error,
				message: "Agent run finished hooks failed",
				scope: constants.logScopes.ai,
				data: { runId: data.runId },
			});
		}
	} catch (error) {
		logger.error({
			error,
			message: "Agent run finished hooks failed",
			scope: constants.logScopes.ai,
			data: { runId: data.runId },
		});
	}

	return { error: undefined, data: undefined };
};

export default executeRunFinishedHooks;
