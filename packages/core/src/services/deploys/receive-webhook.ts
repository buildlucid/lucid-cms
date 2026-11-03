import constants from "../../constants/constants.js";
import { getDeploy } from "../../libs/deploys/registry.js";
import type { DeployProviderUpdate } from "../../libs/deploys/types.js";
import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import { DeployRunsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import applyRunUpdate from "./helpers/apply-run-update.js";

/**
 * Passes a host's status update to the deploy's provider and records it against the run with the
 * same external ID. Updates for runs Lucid doesn't know about are ignored.
 */
const receiveWebhook: ServiceFn<
	[{ key: string; request: Request }],
	undefined
> = async (context, data) => {
	const deploy = getDeploy(context.config, data.key);
	if (!deploy?.provider.webhook) {
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

	let update: (DeployProviderUpdate & { externalId: string }) | null;
	try {
		update = await deploy.provider.webhook(context, data.request);
	} catch (error) {
		logger.warn({
			message: `A ${deploy.key} deploy webhook was rejected`,
			scope: constants.logScopes.deploys,
			data: {
				deploy: deploy.key,
				reason: error instanceof Error ? error.message : String(error),
			},
		});
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.deploys.webhook.rejected"),
			},
			data: undefined,
		};
	}
	if (!update) return { error: undefined, data: undefined };

	const DeployRuns = new DeployRunsRepository(context.db);
	const run = await DeployRuns.selectSingle({
		select: ["id"],
		where: [
			{ key: "deploy_key", operator: "=", value: deploy.key },
			{ key: "external_id", operator: "=", value: update.externalId },
		],
	});
	if (run.error) return run;

	const found = run.data;
	if (!found) return { error: undefined, data: undefined };

	return withTransaction(context, (context) =>
		applyRunUpdate(context, { deploy, runId: found.id, update }),
	);
};

export default receiveWebhook;
