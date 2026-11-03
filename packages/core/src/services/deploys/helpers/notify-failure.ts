import constants from "../../../constants/constants.js";
import type { DeployDefinition } from "../../../libs/deploys/types.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import upsertNotification from "../../notifications/upsert.js";
import { deployFailedNotification } from "../notifications/deploy-failed.js";
import { deployNotificationKeys } from "../notifications/keys.js";
import describeRun from "./describe-run.js";
import getDeployRecipients from "./get-deploy-recipients.js";

/**
 * Tells people who can turn the deploy off that a run failed, refreshing any earlier notice.
 * @remarks Notification errors are logged without changing the run.
 */
const notifyFailure = async (
	context: ServiceContext,
	props: {
		deploy: DeployDefinition;
		runId: number;
		status: "failed" | "timed-out";
		message: string | null;
	},
) => {
	const notified = await withTransaction(
		context,
		async (context) => {
			const recipients = await getDeployRecipients(context, {
				deploy: props.deploy,
				action: "manage",
			});
			if (recipients.error) return recipients;

			//* a timeout's message only repeats that it timed out
			const detail = await describeRun(context, {
				runId: props.runId,
				status: props.status,
				message: props.status === "failed" ? props.message : null,
			});
			if (detail.error) return detail;

			return upsertNotification(context, {
				definition: deployFailedNotification,
				recipients: recipients.data,
				key: deployNotificationKeys.failed(props.deploy.key),
				data: {
					deployKey: props.deploy.key,
					name: context.translate(props.deploy.name),
					status: props.status,
					message: props.message,
					detail: detail.data,
				},
			});
		},
		{ isolate: true },
	).catch((error: unknown) => ({ error, data: undefined }));
	if (notified.error) {
		logger.error({
			error: notified.error,
			event: "deploys.failure-notification.failed",
			message: "A deploy failure notification could not be sent",
			scope: constants.logScopes.deploys,
			data: { deploy: props.deploy.key },
		});
	}
};

export default notifyFailure;
