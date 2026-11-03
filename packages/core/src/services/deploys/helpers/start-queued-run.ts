import type { DeployDefinition } from "../../../libs/deploys/types.js";
import { enqueueJob } from "../../../libs/jobs/enqueue.js";
import { DeployRunsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { startDeployRunJob } from "../jobs/start-run.js";

/**
 * Hands the deploy's queued run to the start job, unless another run is still starting or running.
 * @remarks From here the run can't take more triggers, which queue a new run instead.
 */
const startQueuedRun: ServiceFn<
	[{ deploy: DeployDefinition }],
	undefined
> = async (context, data) => {
	const DeployRuns = new DeployRunsRepository(context.db);

	const queued = await DeployRuns.selectSingle({
		select: ["id"],
		where: [
			{ key: "deploy_key", operator: "=", value: data.deploy.key },
			{ key: "status", operator: "=", value: "queued" },
		],
	});
	if (queued.error) return queued;
	if (!queued.data) return { error: undefined, data: undefined };

	const now = new Date();
	const started = await DeployRuns.markStarting({
		id: queued.data.id,
		deployKey: data.deploy.key,
		startedAt: now.toISOString(),
		expiresAt: new Date(
			now.getTime() + data.deploy.timeoutSeconds * 1000,
		).toISOString(),
	});
	if (started.error) return started;
	if (!started.data) return { error: undefined, data: undefined };

	const enqueued = await enqueueJob(context, {
		job: startDeployRunJob,
		payload: { runId: queued.data.id },
	});
	if (enqueued.error) return enqueued;

	return { error: undefined, data: undefined };
};

export default startQueuedRun;
