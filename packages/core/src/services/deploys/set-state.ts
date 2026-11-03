import { getDeploy } from "../../libs/deploys/registry.js";
import { copy } from "../../libs/i18n/index.js";
import {
	DeployOverridesRepository,
	DeployRunsRepository,
	DeployTriggersRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Disabling drops pending triggers and queued work and prevents new runs. Active host runs
 * continue.
 */
const setState: ServiceFn<
	[{ key: string; enabled: boolean; userId?: number }],
	undefined
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

	if (data.enabled) {
		const enabled = await DeployOverrides.deleteSingle({
			where: [{ key: "deploy_key", operator: "=", value: deploy.key }],
		});
		if (enabled.error) return enabled;
		return { error: undefined, data: undefined };
	}

	const DeployTriggers = new DeployTriggersRepository(context.db);
	const DeployRuns = new DeployRunsRepository(context.db);

	const disabled = await DeployOverrides.upsertDisabled({
		deployKey: deploy.key,
		disabledAt: new Date().toISOString(),
		disabledByUserId: data.userId ?? null,
	});
	if (disabled.error) return disabled;

	const dropped = await DeployTriggers.deleteMultiple({
		where: [{ key: "deploy_key", operator: "=", value: deploy.key }],
	});
	if (dropped.error) return dropped;

	//* starting runs are left to their start job, which cancels them unless the host already has them
	const cancelled = await DeployRuns.updateSingle({
		data: { status: "cancelled", finished_at: new Date().toISOString() },
		where: [
			{ key: "deploy_key", operator: "=", value: deploy.key },
			{ key: "status", operator: "=", value: "queued" },
		],
	});
	if (cancelled.error) return cancelled;

	return { error: undefined, data: undefined };
};

export default setState;
