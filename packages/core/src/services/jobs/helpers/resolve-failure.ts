import constants from "../../../constants/constants.js";
import logger from "../../../libs/logger/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import resolveNotification from "../../notifications/resolve.js";
import { jobFailedNotification } from "../notifications/job-failed.js";
import { jobNotificationKeys } from "../notifications/keys.js";
import notifiesOnFailure from "./notifies-on-failure.js";

/**
 * Resolves failure notifications for a completed job name so later failures notify users again.
 * @remarks Call after the job transaction commits; notification errors only log.
 */
const resolveFailure = async (
	context: ServiceContext,
	job: { job_id: string; job_name: string; job_version: number },
) => {
	if (!notifiesOnFailure(context, job)) return;

	const resolved = await withTransaction(
		context,
		(context) =>
			resolveNotification(context, {
				definition: jobFailedNotification,
				key: jobNotificationKeys.failed(job.job_name),
			}),
		{ isolate: true },
	).catch((error: unknown) => ({ error, data: undefined }));
	if (resolved.error) {
		logger.error({
			error: resolved.error,
			event: "jobs.failure-notification.resolve-failed",
			message: "A job failure notification could not be resolved",
			scope: constants.logScopes.jobs,
			data: { jobId: job.job_id, jobName: job.job_name },
		});
	}
};

export default resolveFailure;
