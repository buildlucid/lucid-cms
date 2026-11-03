import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import resolveNotification from "../../notifications/resolve.js";
import { deployFailedNotification } from "../notifications/deploy-failed.js";
import { deployNotificationKeys } from "../notifications/keys.js";

/**
 * Resolves a deploy's failure notification once a run gets through, so the next failure notifies again.
 * @remarks Notification errors only log.
 */
const resolveFailure = async (context: ServiceContext, deployKey: string) => {
	const resolved = await withTransaction(
		context,
		(context) =>
			resolveNotification(context, {
				definition: deployFailedNotification,
				key: deployNotificationKeys.failed(deployKey),
			}),
		{ isolate: true },
	).catch((error: unknown) => ({ error, data: undefined }));
	if (resolved.error) {
		logger.error({
			error: resolved.error,
			event: "deploys.failure-notification.resolve-failed",
			message: "A deploy failure notification could not be resolved",
			scope: constants.logScopes.deploys,
			data: { deploy: deployKey },
		});
	}
};

export default resolveFailure;
