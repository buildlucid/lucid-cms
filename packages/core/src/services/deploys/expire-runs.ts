import { getDeploy } from "../../libs/deploys/registry.js";
import { copy } from "../../libs/i18n/index.js";
import { DeployRunsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import applyRunUpdate from "./helpers/apply-run-update.js";
import checkRunStatus from "./helpers/check-run-status.js";

/** Checks host status once more before timing out overdue runs and freeing their slots. */
const expireRuns: ServiceFn<[], undefined> = async (context) => {
	const DeployRuns = new DeployRunsRepository(context.db);

	const expired = await DeployRuns.selectMultiple({
		select: ["id", "deploy_key", "source", "trigger_count", "external_id"],
		where: [
			{ key: "status", operator: "in", value: ["starting", "running"] },
			{ key: "expires_at", operator: "<", value: new Date().toISOString() },
		],
	});
	if (expired.error) return expired;

	const message = context.translate(copy("server:core.deploys.run.timed.out"));
	for (const run of expired.data ?? []) {
		const deploy = getDeploy(context.config, run.deploy_key);
		if (!deploy) {
			const timedOut = await DeployRuns.updateSingle({
				data: {
					status: "timed-out",
					message,
					finished_at: new Date().toISOString(),
				},
				where: [{ key: "id", operator: "=", value: run.id }],
			});
			if (timedOut.error) return timedOut;
			continue;
		}

		const last = await checkRunStatus(context, { deploy, run });
		const applied = await withTransaction(context, (context) =>
			applyRunUpdate(context, {
				deploy,
				runId: run.id,
				update:
					last && last.status !== "running"
						? last
						: { status: "timed-out", message },
			}),
		);
		if (applied.error) return applied;
	}

	return { error: undefined, data: undefined };
};

export default expireRuns;
