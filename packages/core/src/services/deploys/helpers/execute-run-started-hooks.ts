import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RunHookRow } from "./execute-run-finished-hooks.js";

/**
 * Runs start hooks in the transaction moving the run from `starting` to `running`, using its
 * returned row. Isolates and logs hook failures without stopping the run.
 */
const executeRunStartedHooks: ServiceFn<
	[{ run: RunHookRow }],
	undefined
> = async (context, { run }) => {
	if (!context.config.hooks.some((hook) => hook.service === "deploys")) {
		return { error: undefined, data: undefined };
	}

	try {
		await executeHooks(
			context,
			{
				service: "deploys",
				event: "afterRunStart",
				config: context.config,
				onError: (error) => {
					logger.error({
						error,
						message: "A deploy run started hook failed",
						scope: constants.logScopes.deploys,
						data: { deploy: run.deploy_key, runId: run.id },
					});
				},
			},
			{
				meta: {},
				data: {
					deployKey: run.deploy_key,
					runId: run.id,
					source: run.source,
					startedByUserId: run.started_by_user_id,
					agentRunId: run.agent_run_id,
					url: run.url,
					//* starting runs always have started_at, so the fallback only narrows the type
					startedAt: formatter.formatDate(run.started_at ?? run.created_at),
				},
			},
		);
	} catch (error) {
		logger.error({
			error,
			message: "A deploy run started hook failed",
			scope: constants.logScopes.deploys,
			data: { deploy: run.deploy_key, runId: run.id },
		});
	}

	return { error: undefined, data: undefined };
};

export default executeRunStartedHooks;
