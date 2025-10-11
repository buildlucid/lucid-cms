import T from "../../translations/index.js";
import constants from "../../constants/constants.js";
import logger from "../logger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../utils/services/types.js";
import services from "../../services/index.js";

const setupCronJobs = (context: ServiceContext) => {
	return {
		schedule: constants.cronSchedule,
		register: async () => {
			try {
				logger.info({
					message: T("running_cron_jobs"),
					scope: constants.logScopes.cron,
				});

				await Promise.allSettled([
					serviceWrapper(services.crons.clearExpiredLocales, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T("an_error_occurred_clearing_expired_locales"),
						},
					})(context),
					serviceWrapper(services.crons.clearExpiredCollections, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T("an_error_occurred_clearing_expired_collections"),
						},
					})(context),
					serviceWrapper(services.crons.clearExpiredTokens, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T("an_error_occurred_clearing_expired_tokens"),
						},
					})(context),
					serviceWrapper(services.crons.updateMediaStorage, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T("an_error_occurred_updating_media_storage"),
						},
					})(context),
					serviceWrapper(services.crons.deleteExpiredUnsyncedMedia, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T("an_error_occurred_deleting_expired_media"),
						},
					})(context),
					serviceWrapper(services.crons.deleteExpiredDeletedMedia, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T("an_error_occurred_deleting_old_soft_deleted_media"),
						},
					})(context),
					serviceWrapper(services.crons.deleteExpiredDeletedUsers, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T("an_error_occurred_deleting_old_soft_deleted_users"),
						},
					})(context),
					serviceWrapper(services.crons.deleteExpiredDeletedDocuments, {
						transaction: true,
						logError: true,
						defaultError: {
							type: "cron",
							name: T("cron_job_error_name"),
							message: T(
								"an_error_occurred_deleting_old_soft_deleted_documents",
							),
						},
					})(context),
				]);
			} catch (error) {
				logger.error({
					message: T("cron_job_error_message"),
					scope: constants.logScopes.cron,
				});
			}
		},
	};
};

export default setupCronJobs;
