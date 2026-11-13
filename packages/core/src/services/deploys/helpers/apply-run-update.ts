import type { DeployDefinition } from "../../../libs/deploys/types.js";
import { DeployRunsRepository } from "../../../libs/repositories/index.js";
import type { DeployRunStatus } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import executeRunFinishedHooks, {
	runHookColumns,
} from "./execute-run-finished-hooks.js";
import executeRunStartedHooks from "./execute-run-started-hooks.js";
import notifyFailure from "./notify-failure.js";
import notifySuccess from "./notify-success.js";
import resolveFailure from "./resolve-failure.js";
import startQueuedRun from "./start-queued-run.js";

type RunUpdate = {
	status: Exclude<DeployRunStatus, "queued" | "starting">;
	externalId?: string;
	url?: string;
	message?: string;
};

/**
 * The statuses each update can move a run from. A late host result still replaces a timeout, and
 * a running run takes later `running` updates as a refresh of its URL and message.
 */
const updatableFrom: Record<RunUpdate["status"], DeployRunStatus[]> = {
	running: ["starting"],
	succeeded: ["starting", "running", "timed-out"],
	failed: ["starting", "running", "timed-out"],
	triggered: ["starting", "running", "timed-out"],
	"timed-out": ["starting", "running"],
	cancelled: ["queued", "starting", "running"],
};

/**
 * Records status, runs `deploys.afterRunStart` hooks once a run is running and `deploys.afterRunFinish`
 * hooks once it finishes, sends notifications and starts queued work after completion.
 * @remarks Conditional status transitions keep concurrent callbacks and trigger responses ordered
 * or ignored, so each hook fires only for the update that made the transition.
 */
const applyRunUpdate: ServiceFn<
	[{ deploy: DeployDefinition; runId: number; update: RunUpdate }],
	undefined
> = async (context, data) => {
	const DeployRuns = new DeployRunsRepository(context.db);
	const finished = data.update.status !== "running";

	const values = {
		status: data.update.status,
		...(finished && { finished_at: new Date().toISOString() }),
		...(data.update.externalId !== undefined && {
			external_id: data.update.externalId,
		}),
		...(data.update.url !== undefined && { url: data.update.url }),
		//* a finished run's message describes how it finished, replacing any earlier one
		...((finished || data.update.message !== undefined) && {
			message: data.update.message ?? null,
		}),
	};

	const updated = await DeployRuns.updateSingle({
		data: values,
		where: [
			{ key: "id", operator: "=", value: data.runId },
			{
				key: "status",
				operator: "in",
				value: updatableFrom[data.update.status],
			},
		],
		returning: runHookColumns,
	});
	if (updated.error) return updated;

	const { status } = data.update;
	if (updated.data && status === "running") {
		await executeRunStartedHooks(context, { run: updated.data });
		return { error: undefined, data: undefined };
	}

	if (!updated.data && status === "running") {
		const refreshed = await DeployRuns.updateSingle({
			data: values,
			where: [
				{ key: "id", operator: "=", value: data.runId },
				{ key: "status", operator: "=", value: "running" },
			],
			returning: ["id"],
		});
		if (refreshed.error) return refreshed;
		if (refreshed.data) return { error: undefined, data: undefined };
	}

	//* a run can time out while its start job waits on the host, so keep the host's ID for later results
	if (!updated.data && status === "running" && data.update.externalId) {
		const kept = await DeployRuns.updateSingle({
			data: {
				external_id: data.update.externalId,
				...(data.update.url !== undefined && { url: data.update.url }),
			},
			where: [
				{ key: "id", operator: "=", value: data.runId },
				{ key: "status", operator: "=", value: "timed-out" },
				{ key: "external_id", operator: "is", value: null },
			],
		});
		if (kept.error) return kept;
	}
	if (!updated.data || status === "running") {
		return { error: undefined, data: undefined };
	}

	await executeRunFinishedHooks(context, { run: updated.data, status });

	//* a late result for an older run leaves the newer run's notification alone
	const newer = await DeployRuns.selectNewerReached({
		deployKey: data.deploy.key,
		id: data.runId,
	});
	if (newer.error) return newer;

	if (!newer.data) {
		if (data.update.status === "failed" || data.update.status === "timed-out") {
			await notifyFailure(context, {
				deploy: data.deploy,
				runId: data.runId,
				status: data.update.status,
				message: data.update.message ?? null,
			});
		} else if (data.update.status !== "cancelled") {
			await resolveFailure(context, data.deploy.key);
			if (data.update.status === "succeeded") {
				await notifySuccess(context, {
					deploy: data.deploy,
					runId: data.runId,
				});
			}
		}
	}

	return startQueuedRun(context, { deploy: data.deploy });
};

export default applyRunUpdate;
