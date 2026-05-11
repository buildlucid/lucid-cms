import constants from "../../constants/constants.js";
import T from "../../translations/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../utils/services/types.js";
import logger from "../logger/index.js";
import passthroughQueueAdapter from "../queue/adapters/passthrough.js";
import getQueueAdapter from "../queue/get-adapter.js";
import type { QueueAdapterInstance } from "../queue/types.js";
import getCronJobs, { type CronJobDefinition } from "./cron-jobs.js";
import type { AdapterRuntimeContext, EnvironmentVariables } from "./types.js";

const MAX_RETRIES = 3;

/**
 * Executes a single cron job with retry support.
 * Uses serviceWrapper so errors are returned as values rather than thrown.
 */
const executeCronJob = async (
	key: string,
	job: CronJobDefinition,
	context: ServiceContext,
): Promise<{ key: string; success: boolean; error?: string }> => {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		const result = await serviceWrapper(job.fn, {
			transaction: job.transaction,
			logError: true,
			defaultError: {
				type: "cron",
				name: T("cron_job_error_name"),
				message: job.error,
			},
		})(context);

		if (!result.error) {
			return { key, success: true };
		}

		if (attempt < MAX_RETRIES) {
			logger.warn({
				message: `Cron job "${job.label}" failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
				scope: constants.logScopes.cron,
				data: { error: result.error.message },
			});
		} else {
			logger.error({
				message: `Cron job "${job.label}" failed after ${MAX_RETRIES} attempts`,
				scope: constants.logScopes.cron,
				data: { error: result.error.message },
			});
			return {
				key,
				success: false,
				error: result.error.message,
			};
		}
	}

	return { key, success: false };
};

/**
 * Creates the environment for running cron jobs
 * - creates a passthrough queue adapter so runtime adapters can build the ServiceContext. This allows crons to insert jobs into the queue.
 */
const setupCronJobs = async (config: {
	createQueue: boolean;
	runtimeContext?: AdapterRuntimeContext;
	env?: EnvironmentVariables;
}) => {
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

	const schedules = Object.values(constants.cronSchedules);

	return {
		schedules,
		register: async (
			context: ServiceContext,
			options?: {
				schedule?: string;
			},
		) => {
			let cronQueue = context.queue ?? queueInstance;
			let createdQueue: QueueAdapterInstance | undefined;
			try {
				if (config.createQueue && config.runtimeContext) {
					createdQueue = await getQueueAdapter(
						context.config,
						config.runtimeContext,
					);
					await createdQueue.lifecycle?.init?.({
						config: context.config,
						runtimeContext: config.runtimeContext,
						env: config.env ?? context.env ?? undefined,
					});
					cronQueue = createdQueue;
				}

				const cronContext: ServiceContext = {
					...context,
					queue: cronQueue,
				};

				logger.info({
					message: T("running_cron_jobs"),
					scope: constants.logScopes.cron,
				});

				const jobs = Object.entries(getCronJobs()).filter(([, job]) => {
					if (!options?.schedule) return true;
					return constants.cronSchedules[job.schedule] === options.schedule;
				});

				const results = await Promise.allSettled(
					jobs.map(([key, job]) => executeCronJob(key, job, cronContext)),
				);

				const failures = results.filter(
					(r) =>
						r.status === "rejected" ||
						(r.status === "fulfilled" && !r.value.success),
				);

				if (failures.length > 0) {
					logger.error({
						message: `${failures.length} of ${results.length} cron jobs failed`,
						scope: constants.logScopes.cron,
					});
				}
			} catch (_) {
				logger.error({
					message: T("cron_job_error_message"),
					scope: constants.logScopes.cron,
				});
			} finally {
				await createdQueue?.lifecycle?.destroy?.();
			}
		},
		queue: queueInstance,
	};
};

export default setupCronJobs;
