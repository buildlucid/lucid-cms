import constants from "../../../constants/constants.js";
import { getDeployCallbackUrl } from "../../../libs/deploys/callback.js";
import type {
	DeployDefinition,
	DeployProviderUpdate,
} from "../../../libs/deploys/types.js";
import logger from "../../../libs/logger/index.js";
import type { DeployRunSource } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Checks host status. Returns null if unsupported, unchanged or unreachable; logs connection
 * failures.
 */
const checkRunStatus = async (
	context: ServiceContext,
	data: {
		deploy: DeployDefinition;
		run: {
			id: number;
			source: DeployRunSource;
			trigger_count: number;
			external_id: string | null;
		};
	},
): Promise<DeployProviderUpdate | null> => {
	if (!data.deploy.provider.status || data.run.external_id === null) {
		return null;
	}

	try {
		return await data.deploy.provider.status(context, {
			id: data.run.id,
			deployKey: data.deploy.key,
			source: data.run.source,
			triggerCount: data.run.trigger_count,
			callbackUrl: getDeployCallbackUrl(context, data.run.id),
			externalId: data.run.external_id,
		});
	} catch (error) {
		logger.warn({
			message: `The ${data.deploy.key} deploy's status check failed`,
			scope: constants.logScopes.deploys,
			data: {
				runId: data.run.id,
				reason: error instanceof Error ? error.message : String(error),
			},
		});
		return null;
	}
};

export default checkRunStatus;
