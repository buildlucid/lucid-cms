import { deployCallbackTokenMatches } from "../../libs/deploys/callback.js";
import { getDeploy } from "../../libs/deploys/registry.js";
import type { DeployProviderUpdate } from "../../libs/deploys/types.js";
import { copy } from "../../libs/i18n/index.js";
import { DeployRunsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import applyRunUpdate from "./helpers/apply-run-update.js";

/** Records a status a run's CI POSTed to the run's signed callback URL. */
const callback: ServiceFn<
	[{ id: number; token: string; update: DeployProviderUpdate }],
	undefined
> = async (context, data) => {
	if (!deployCallbackTokenMatches(context, data.id, data.token)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.deploys.callback.invalid"),
			},
			data: undefined,
		};
	}

	const DeployRuns = new DeployRunsRepository(context.db);
	const run = await DeployRuns.selectSingle({
		select: ["id", "deploy_key"],
		where: [{ key: "id", operator: "=", value: data.id }],
	});
	if (run.error) return run;

	const deploy = run.data
		? getDeploy(context.config, run.data.deploy_key)
		: null;
	if (!run.data || !deploy) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.deploys.run.not.found"),
			},
			data: undefined,
		};
	}

	return applyRunUpdate(context, {
		deploy,
		runId: run.data.id,
		update: data.update,
	});
};

export default callback;
