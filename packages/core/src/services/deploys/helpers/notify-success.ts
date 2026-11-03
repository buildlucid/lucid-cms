import constants from "../../../constants/constants.js";
import type { DeployDefinition } from "../../../libs/deploys/types.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import upsertNotification from "../../notifications/upsert.js";
import { deploySucceededNotification } from "../notifications/deploy-succeeded.js";
import { deployNotificationKeys } from "../notifications/keys.js";
import describeRun from "./describe-run.js";
import getDeployRecipients from "./get-deploy-recipients.js";

/**
 * Tells people who can see deploys that a run's changes are live, refreshing the deploy's earlier notice.
 * @remarks Notification errors are logged without changing the run.
 */
const notifySuccess = async (
	context: ServiceContext,
	props: { deploy: DeployDefinition; runId: number },
) => {
	const notified = await withTransaction(
		context,
		async (context) => {
			const recipients = await getDeployRecipients(context, {
				deploy: props.deploy,
				action: "read",
			});
			if (recipients.error) return recipients;

			const detail = await describeRun(context, {
				runId: props.runId,
				status: "succeeded",
			});
			if (detail.error) return detail;

			return upsertNotification(context, {
				definition: deploySucceededNotification,
				recipients: recipients.data,
				key: deployNotificationKeys.succeeded(props.deploy.key),
				//* each run tells people again, rather than leaving the earlier notice read
				fingerprint: String(props.runId),
				data: {
					deployKey: props.deploy.key,
					name: context.translate(props.deploy.name),
					detail: detail.data,
				},
			});
		},
		{ isolate: true },
	).catch((error: unknown) => ({ error, data: undefined }));
	if (notified.error) {
		logger.error({
			error: notified.error,
			event: "deploys.success-notification.failed",
			message: "A deploy success notification could not be sent",
			scope: constants.logScopes.deploys,
			data: { deploy: props.deploy.key },
		});
	}
};

export default notifySuccess;
