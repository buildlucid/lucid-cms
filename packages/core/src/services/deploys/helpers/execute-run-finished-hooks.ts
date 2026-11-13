import constants from "../../../constants/constants.js";
import type { LucidDeployRuns } from "../../../libs/db/tables/deploy-runs.js";
import type { Select } from "../../../libs/db/types.js";
import formatter from "../../../libs/formatters/index.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import type { DeployRunFinishedHookData } from "../../../libs/hooks/types.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** The run columns the deploy run hooks read. Return them from the update that stores the status. */
export const runHookColumns = [
	"id",
	"deploy_key",
	"source",
	"started_by_user_id",
	"agent_run_id",
	"url",
	"message",
	"created_at",
	"started_at",
	"finished_at",
] satisfies Array<keyof Select<LucidDeployRuns>>;

/** A run row as `runHookColumns` returns it. */
export type RunHookRow = Pick<
	Select<LucidDeployRuns>,
	(typeof runHookColumns)[number]
>;

/**
 * Runs finish hooks in the transaction storing the final status, using its returned row. Isolates
 * and logs hook failures without preventing completion.
 */
const executeRunFinishedHooks: ServiceFn<
	[{ run: RunHookRow; status: DeployRunFinishedHookData["status"] }],
	undefined
> = async (context, { run, status }) => {
	if (!context.config.hooks.some((hook) => hook.service === "deploys")) {
		return { error: undefined, data: undefined };
	}

	try {
		await executeHooks(
			context,
			{
				service: "deploys",
				event: "afterRunFinish",
				config: context.config,
				onError: (error) => {
					logger.error({
						error,
						message: "A deploy run finished hook failed",
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
					status,
					source: run.source,
					startedByUserId: run.started_by_user_id,
					agentRunId: run.agent_run_id,
					url: run.url,
					message: run.message,
					startedAt: formatter.formatDate(run.started_at),
					//* every update that finishes a run sets finished_at, so the fallback only narrows the type
					finishedAt: formatter.formatDate(run.finished_at ?? run.created_at),
				},
			},
		);
	} catch (error) {
		logger.error({
			error,
			message: "A deploy run finished hook failed",
			scope: constants.logScopes.deploys,
			data: { deploy: run.deploy_key, runId: run.id },
		});
	}

	return { error: undefined, data: undefined };
};

export default executeRunFinishedHooks;
