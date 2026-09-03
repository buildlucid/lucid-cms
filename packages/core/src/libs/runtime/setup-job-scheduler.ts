import constants from "../../constants/constants.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import { maintainJobQueue } from "../jobs/maintenance.js";
import runJobScheduler from "../jobs/scheduler/index.js";
import logger from "../logger/index.js";

const maintainQueue = serviceWrapper(maintainJobQueue, {
	transaction: false,
	logError: true,
	defaultError: {
		message: copy("server:core.jobs.maintenance.failed"),
	},
});

const runScheduler: ServiceFn<
	[options?: { scheduledAt?: Date }],
	undefined
> = async (context, options = {}) => {
	const locale = context.config.i18n.defaultLocale;
	const schedulerContext = {
		...context,
		translate: context.translate.forLocale(locale),
		request: { ...context.request, locale },
	};

	logger.info({
		message: "Running the job scheduler",
		scope: constants.logScopes.scheduler,
	});

	const maintenance = await maintainQueue(schedulerContext);
	const schedules = await runJobScheduler(
		schedulerContext,
		options.scheduledAt ?? new Date(),
	);

	if (maintenance.error || schedules.error) {
		logger.error({
			message: "The job scheduler tick did not complete",
			scope: constants.logScopes.scheduler,
			data: {
				maintenance: maintenance.error
					? schedulerContext.translate.english(maintenance.error.message)
					: null,
				schedules: schedules.error
					? schedulerContext.translate.english(schedules.error.message)
					: null,
			},
		});
	}

	return {
		error: schedules.error ?? maintenance.error,
		data: undefined,
	};
};

/**
 * Exposes the one infrastructure timer required by Lucid. Runtime adapters own
 * provisioning and call `run`; core evaluates the schedules registered on jobs.
 */
const setupJobScheduler = () => ({
	schedule: constants.jobSchedulerCron,
	run: runScheduler,
});

export default setupJobScheduler;
