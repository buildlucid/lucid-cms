import type { DeployDefinition } from "../../../libs/deploys/types.js";
import { DeployRunsRepository } from "../../../libs/repositories/index.js";
import type { DeployRunStatus } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
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

/** The statuses each update can move a run from. A late host result still replaces a timeout. */
const updatableFrom: Record<RunUpdate["status"], DeployRunStatus[]> = {
	running: ["starting", "running"],
	succeeded: ["starting", "running", "timed-out"],
	failed: ["starting", "running", "timed-out"],
	triggered: ["starting", "running", "timed-out"],
	"timed-out": ["starting", "running"],
	cancelled: ["queued", "starting", "running"],
};

/**
 * Records status, sends notifications and starts queued work after completion.
 * @remarks Conditional status transitions keep concurrent callbacks and trigger responses ordered
 * or ignored.
 */
const applyRunUpdate: ServiceFn<
	[{ deploy: DeployDefinition; runId: number; update: RunUpdate }],
	undefined
> = async (context, data) => {
	const DeployRuns = new DeployRunsRepository(context.db);
	const finished = data.update.status !== "running";

	const updated = await DeployRuns.updateSingle({
		data: {
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
		},
		where: [
			{ key: "id", operator: "=", value: data.runId },
			{
				key: "status",
				operator: "in",
				value: updatableFrom[data.update.status],
			},
		],
		returning: ["id"],
	});
	if (updated.error) return updated;

	//* a run can time out while its start job waits on the host, so keep the host's ID for later results
	if (
		!updated.data &&
		data.update.status === "running" &&
		data.update.externalId
	) {
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
	if (!updated.data || !finished) return { error: undefined, data: undefined };

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
