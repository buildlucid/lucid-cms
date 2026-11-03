import { getDeploy } from "../../libs/deploys/registry.js";
import { DeployRunsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import applyRunUpdate from "./helpers/apply-run-update.js";
import checkRunStatus from "./helpers/check-run-status.js";

/** Polls providers with a `status` check about their running runs. Hosts that can't be reached are asked again next time. */
const checkRuns: ServiceFn<[], undefined> = async (context) => {
	const DeployRuns = new DeployRunsRepository(context.db);

	const running = await DeployRuns.selectMultiple({
		select: ["id", "deploy_key", "source", "trigger_count", "external_id"],
		where: [
			{ key: "status", operator: "=", value: "running" },
			{ key: "external_id", operator: "is not", value: null },
		],
	});
	if (running.error) return running;

	for (const run of running.data ?? []) {
		//* webhooks replace polling, with one last check before the run times out
		const deploy = getDeploy(context.config, run.deploy_key);
		if (!deploy || deploy.provider.webhook) continue;

		const update = await checkRunStatus(context, { deploy, run });
		if (!update) continue;

		const applied = await withTransaction(context, (context) =>
			applyRunUpdate(context, { deploy, runId: run.id, update }),
		);
		if (applied.error) return applied;
	}

	return { error: undefined, data: undefined };
};

export default checkRuns;
