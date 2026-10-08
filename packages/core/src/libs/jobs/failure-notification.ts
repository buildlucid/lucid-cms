import constants from "../../constants/constants.js";
import { jobFailedNotification } from "../../services/jobs/notifications/job-failed.js";
import { jobNotificationKeys } from "../../services/jobs/notifications/keys.js";
import resolveNotification from "../../services/notifications/resolve.js";
import upsertNotification from "../../services/notifications/upsert.js";
import type { ServiceContext } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import logger from "../logger/index.js";
import { getJobDefinitionRuntime, getRegisteredJob } from "./registry.js";

type NotifiedJob = {
	job_id: string;
	job_name: string;
	job_version: number;
};

/** Whether a job's failures notify people. Jobs with no registered definition always do. */
const notifiesOnFailure = (context: ServiceContext, job: NotifiedJob) => {
	const definition = getRegisteredJob(context.config, {
		name: job.job_name,
		version: job.job_version,
	});
	return definition
		? getJobDefinitionRuntime(definition).notifyOnFailure
		: true;
};

/**
 * Tells everyone who can read jobs that a job failed for good. Repeat
 * failures of the same job refresh the open notification without telling
 * people again. Errors are logged so they never change the job's outcome.
 */
export const notifyJobFailure = async (
	context: ServiceContext,
	props: { job: NotifiedJob; errorMessage: string },
) => {
	if (!notifiesOnFailure(context, props.job)) return;

	try {
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
		);
		if (notified.error) {
			logger.error({
				error: notified.error,
				event: "jobs.failure-notification.failed",
				message: "A job failure notification could not be sent",
				scope: constants.logScopes.jobs,
				data: { jobId: props.job.job_id, jobName: props.job.job_name },
			});
		}
	} catch (error) {
		logger.error({
			error,
			event: "jobs.failure-notification.failed",
			message: "A job failure notification could not be sent",
			scope: constants.logScopes.jobs,
			data: { jobId: props.job.job_id, jobName: props.job.job_name },
		});
	}
};

/**
 * Resolves the open failure notification for a job that has completed, so
 * its next failure tells people again. Call after the job's own transaction
 * commits. Errors are logged.
 */
export const resolveJobFailure = async (
	context: ServiceContext,
	job: NotifiedJob,
) => {
	if (!notifiesOnFailure(context, job)) return;

	const resolved = await resolveNotification(context, {
		definition: jobFailedNotification,
		key: jobNotificationKeys.failed(job.job_name),
	});
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
