import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import upsertNotification from "../../notifications/upsert.js";
import { jobFailedNotification } from "../notifications/job-failed.js";
import { jobNotificationKeys } from "../notifications/keys.js";
import notifiesOnFailure from "./notifies-on-failure.js";

/**
 * Notifies job readers of permanent failure, refreshing an existing notification for the same job name.
 * @remarks Notification errors are logged without changing the job outcome.
 */
const notifyFailure = async (
	context: ServiceContext,
	props: {
		job: { job_id: string; job_name: string; job_version: number };
		errorMessage: string;
	},
) => {
	if (!notifiesOnFailure(context, props.job)) return;

	const notified = await withTransaction(
		context,
		(context) =>
			upsertNotification(context, {
				definition: jobFailedNotification,
				key: jobNotificationKeys.failed(props.job.job_name),
				data: {
					jobId: props.job.job_id,
					jobName: props.job.job_name,
					errorMessage: props.errorMessage,
				},
			}),
		{ isolate: true },
	).catch((error: unknown) => ({ error, data: undefined }));
	if (notified.error) {
		logger.error({
			error: notified.error,
			event: "jobs.failure-notification.failed",
			message: "A job failure notification could not be sent",
			scope: constants.logScopes.jobs,
			data: { jobId: props.job.job_id, jobName: props.job.job_name },
		});
	}
};

export default notifyFailure;
