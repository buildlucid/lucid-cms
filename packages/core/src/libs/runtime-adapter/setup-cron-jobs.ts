import constants from "../../constants/constants.js";
import { cronServices } from "../../services/index.js";
import T from "../../translations/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../utils/services/types.js";
import logger from "../logger/index.js";
import passthroughQueueAdapter from "../queue-adapter/adapters/passthrough.js";
import type { QueueAdapterInstance } from "../queue-adapter/types.js";

/**
 * Creates the environment for running cron jobs
 * - creates a passthrough queue adapter so runtime adapters can build the ServiceContext. This allows crons to insert jobs into the queue.
 */
const setupCronJobs = async (config: { createQueue: boolean }) => {
	let queueInstance: QueueAdapterInstance | undefined;

	//* depending on the runtime adapter, they may already be able to access the main queue adapter instance via the createApp function.
	if (config.createQueue) {
		//* we dont pass additionalJobHandlers as at least currently, we dont expose a way for devs to register their own CRON jobs,
		//* meaning we dont need crons to be able to access job handlers that are not core.
		queueInstance = passthroughQueueAdapter({
			//* we bypass immediate execution as we only want to use the queue adapter so CRON job services can push jobs into the queue.
			bypassImmediateExecution: true,
		});
	}

	return {
		schedule: constants.cronSchedule,
		register: async (context: ServiceContext) => {
			try {
				logger.info({
					message: T("running_cron_jobs"),
					scope: constants.logScopes.cron,
				});

				const cronJobs = [
					{
						fn: cronServices.clearExpiredLocales,
						error: T("an_error_occurred_clearing_expired_locales"),
					},
					{
						fn: cronServices.clearExpiredCollections,
						error: T("an_error_occurred_clearing_expired_collections"),
					},
					{
						fn: cronServices.clearExpiredTokens,
						error: T("an_error_occurred_clearing_expired_tokens"),
					},
					{
						fn: cronServices.updateMediaStorage,
						error: T("an_error_occurred_updating_media_storage"),
					},
					{
						fn: cronServices.deleteExpiredUnsyncedMedia,
						error: T("an_error_occurred_deleting_expired_media"),
					},
					{
						fn: cronServices.deleteExpiredDeletedMedia,
						error: T("an_error_occurred_deleting_old_soft_deleted_media"),
					},
					{
						fn: cronServices.deleteExpiredDeletedUsers,
						error: T("an_error_occurred_deleting_old_soft_deleted_users"),
					},
					{
						fn: cronServices.deleteExpiredDeletedDocuments,
						error: T("an_error_occurred_deleting_old_soft_deleted_documents"),
					},
					{
						fn: cronServices.deleteExpiredRevisions,
						error: T("an_error_occurred_deleting_expired_revisions"),
					},
				];

				//* run cron jobs sequentially to avoid concurrent transaction conflicts (e.g. SQLITE_BUSY)
				for (const job of cronJobs) {
					await serviceWrapper(job.fn, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: job.error,
						},
					})(context);
				}
			} catch (_) {
				logger.error({
					message: T("cron_job_error_message"),
					scope: constants.logScopes.cron,
				});
			}
		},
		queue: queueInstance,
	};
};

export default setupCronJobs;
