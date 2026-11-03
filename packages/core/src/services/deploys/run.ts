import { getDeploy } from "../../libs/deploys/registry.js";
import { copy } from "../../libs/i18n/index.js";
import {
	DeployOverridesRepository,
	DeployRunsRepository,
	DeployTriggersRepository,
} from "../../libs/repositories/index.js";
import type { DeployRunSource } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import startQueuedRun from "./helpers/start-queued-run.js";

/**
 * Runs a deploy now, skipping the debounce and taking any waiting triggers with it. While another
 * run is active, it waits as the queued run and starts as soon as that one finishes.
 */
const runDeploy: ServiceFn<
	[
		{
			key: string;
			source: Exclude<DeployRunSource, "trigger">;
			userId?: number | null;
			/** The agent run starting it, shown as the agent acting for `userId` or the system. */
			agentRunId?: string | null;
		},
	],
	{ id: number }
> = async (context, data) => {
	const deploy = getDeploy(context.config, data.key);
	if (!deploy) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.deploys.not.found", {
					data: { deploy: data.key },
				}),
			},
			data: undefined,
		};
	}

	const DeployOverrides = new DeployOverridesRepository(context.db);
	const DeployTriggers = new DeployTriggersRepository(context.db);
	const DeployRuns = new DeployRunsRepository(context.db);

	const override = await DeployOverrides.selectSingle({
		select: ["id"],
		where: [{ key: "deploy_key", operator: "=", value: deploy.key }],
	});
	if (override.error) return override;
	if (override.data) {
		return {
			error: {
				type: "basic",
				status: 409,
				message: copy("server:core.deploys.disabled", {
					data: { deploy: deploy.key },
				}),
			},
			data: undefined,
		};
	}

	const pending = await DeployTriggers.selectPending({
		deployKeys: [deploy.key],
	});
	if (pending.error) return pending;

	const waiting = pending.data[0];
	const claimed = waiting
		? await DeployTriggers.claimThrough({
				deployKey: deploy.key,
				lastId: Number(waiting.last_id),
			})
		: { error: undefined, data: [] };
	if (claimed.error) return claimed;

	const queued = await DeployRuns.upsertQueued({
		deployKey: deploy.key,
		source: data.source,
		triggerCount: claimed.data.length,
		startedByUserId: data.userId ?? null,
		agentRunId: data.agentRunId ?? null,
	});
	if (queued.error) return queued;
	if (!queued.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.deploys.run.failed"),
			},
			data: undefined,
		};
	}

	const started = await startQueuedRun(context, { deploy });
	if (started.error) return started;

	return { error: undefined, data: { id: queued.data.id } };
};

export default runDeploy;
