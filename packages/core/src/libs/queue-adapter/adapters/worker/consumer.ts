import { parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";
import path from "node:path";
import constants from "../../../../constants/constants.js";
import getConfigPath from "../../../config/get-config-path.js";
import loadConfigFile from "../../../config/load-config-file.js";
import type { LucidQueueJobs, Select } from "../../../db-adapter/types.js";
import getKVAdapter from "../../../kv-adapter/get-adapter.js";
import logger from "../../../logger/index.js";
import Repository from "../../../repositories/index.js";
import getJobHandler from "../../job-handlers.js";
import passthroughQueueAdapter from "../passthrough.js";
import type { WorkerQueueAdapterOptions } from "./index.js";
import type {
	AdapterDefineConfig,
	EnvironmentVariables,
} from "../../../runtime-adapter/types.js";
import type { Config } from "../../../../types.js";
import processConfig from "../../../config/process-config.js";

const MIN_POLL_INTERVAL = 1000;
const MAX_POLL_INTERVAL = 30000;
const POLL_INTERVAL_INC = 1000;
const BACKOFF_MULTIPLIER = 2;

const options = workerData.options as WorkerQueueAdapterOptions;
const runtime = workerData.runtime as {
	configEntryPath: string;
	env: EnvironmentVariables | undefined;
};

const CONCURRENT_LIMIT =
	options.concurrentLimit ?? constants.queue.concurrentLimit;
const BATCH_SIZE = options.batchSize ?? constants.queue.batchSize;

/**
 * Attempts to load the config through jiti if it exists.
 * Otherwise, we're likely in a production environment, in which try and load the config through the runtime's built config output.
 */
const getConfig = async (): Promise<{
	config: Config;
	env: EnvironmentVariables | undefined;
}> => {
	try {
		const configPath = getConfigPath(process.cwd());
		const result = await loadConfigFile({ path: configPath });
		return {
			config: result.config,
			env: result.env,
		};
	} catch (_) {
		const configPath = path.resolve(process.cwd(), runtime.configEntryPath);
		const configUrl = pathToFileURL(configPath).href;

		const configModule = await import(configUrl);
		const configFn = configModule.default as AdapterDefineConfig;

		const processedConfig = await processConfig(configFn(runtime.env || {}));

		return {
			config: processedConfig,
			env: runtime.env,
		};
	}
};

const startConsumer = async () => {
	try {
		const { config, env } = await getConfig();

		const kvInstance = await getKVAdapter(config);

		const internalQueueAdapter = passthroughQueueAdapter({
			bypassImmediateExecution: true,
		});

		const QueueJobs = Repository.get("queue-jobs", config.db.client, config.db);

		/**
		 * Handles job failure with retry logic
		 */
		const handleJobFailure = async (
			job: Select<LucidQueueJobs>,
			errorMessage: string,
		) => {
			const shouldRetry = job.attempts < job.max_attempts;

			if (shouldRetry) {
				const nextRetryAt = new Date(
					Date.now() + BACKOFF_MULTIPLIER ** job.attempts * 1000,
				);

				logger.debug({
					message: "Job will retry",
					scope: constants.logScopes.queue,
					data: {
						jobId: job.job_id,
						eventType: job.event_type,
						nextRetryAt: nextRetryAt.toISOString(),
					},
				});

				await QueueJobs.updateSingle({
					data: {
						status: "pending",
						next_retry_at: nextRetryAt.toISOString(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "job_id", operator: "=", value: job.job_id }],
				});
			} else {
				logger.error({
					message: "Job failed permanently",
					scope: constants.logScopes.queue,
					data: {
						jobId: job.job_id,
						eventType: job.event_type,
						errorMessage,
					},
				});

				await QueueJobs.updateSingle({
					data: {
						status: "failed",
						error_message: errorMessage,
						failed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "job_id", operator: "=", value: job.job_id }],
				});
			}
		};
		/**
		 * Processes a job
		 */
		const processJob = async (job: Select<LucidQueueJobs>): Promise<void> => {
			const handler = getJobHandler(job.event_type);

			if (!handler) {
				logger.warn({
					message: "No job handler found for job type",
					scope: constants.logScopes.queue,
					data: { jobId: job.job_id, eventType: job.event_type },
				});

				await QueueJobs.updateSingle({
					data: {
						status: "failed",
						error_message: `No job handler found for job type: ${job.event_type}`,
						failed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "job_id", operator: "=", value: job.job_id }],
				});
				return;
			}

			try {
				logger.debug({
					message: "Processing job",
					scope: constants.logScopes.queue,
					data: { jobId: job.job_id, eventType: job.event_type },
				});

				//* update job to processing status
				const updateJobResInitial = await QueueJobs.updateSingle({
					data: {
						status: "processing",
						attempts: job.attempts + 1,
						started_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "job_id", operator: "=", value: job.job_id }],
				});
				if (updateJobResInitial.error) return;

				//* execute the handler
				const handlerResult = await handler(
					{
						config: config,
						db: config.db.client,
						env: env ?? null,
						// TODO: should handlers be able to push jobs to the queue??
						//* we use the passthrough queue adapter so that any services called within the handler can still push events to the queue.
						//* with bypassImmediateExecution set to true so that the events are not executed immediately like they would by default with this adapter
						queue: internalQueueAdapter,
						kv: kvInstance,
					},
					job.event_data,
				);
				if (handlerResult.error) {
					await handleJobFailure(
						job,
						handlerResult.error.message ?? "Unknown error",
					);
					return;
				}

				//* update job to completed status
				const updateJobRes = await QueueJobs.updateSingle({
					data: {
						status: "completed",
						completed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "job_id", operator: "=", value: job.job_id }],
				});
				if (updateJobRes.error) return;

				logger.debug({
					message: "Job completed successfully",
					scope: constants.logScopes.queue,
					data: { jobId: job.job_id, eventType: job.event_type },
				});
			} catch (error) {
				await handleJobFailure(
					job,
					error instanceof Error ? error.message : "Unknown error",
				);
			}
		};

		// -----------------------------------------
		// Polling
		let pollInterval = MIN_POLL_INTERVAL;

		/**
		 * Polls for jobs and processes them
		 */
		const poll = async (): Promise<void> => {
			try {
				const jobsResult = await QueueJobs.selectJobsForProcessing({
					data: {
						limit: BATCH_SIZE,
						currentTime: new Date(),
					},
					validation: {
						enabled: true,
					},
				});
				if (jobsResult.error) {
					logger.error({
						message: "Error getting ready jobs",
						scope: constants.logScopes.queue,
						data: { error: jobsResult.error },
					});
					return;
				}

				logger.debug({
					message: "Jobs found",
					scope: constants.logScopes.queue,
					data: { jobs: jobsResult.data.length },
				});

				//* we slow the polling down if no jobs are found
				if (jobsResult.data.length === 0) {
					pollInterval = Math.min(
						pollInterval + POLL_INTERVAL_INC,
						MAX_POLL_INTERVAL,
					);
				} else {
					//* jobs found, reset to fast polling
					pollInterval = MIN_POLL_INTERVAL;

					const chunks = [];
					for (let i = 0; i < jobsResult.data.length; i += CONCURRENT_LIMIT) {
						chunks.push(jobsResult.data.slice(i, i + CONCURRENT_LIMIT));
					}

					for (const chunk of chunks) {
						await Promise.allSettled(chunk.map((job) => processJob(job)));
					}
				}
			} catch (error) {
				logger.error({
					message: "Polling error",
					scope: constants.logScopes.queue,
					data: { error },
				});
			}

			setTimeout(poll, pollInterval);
		};

		parentPort?.on("message", ({ type }) => {
			if (type === "CHECK_NOW") poll();
		});

		logger.debug({
			message: "Starting queue polling",
			scope: constants.logScopes.queue,
		});
		poll();
	} catch (error) {
		logger.error({
			message: "Consumer startup error",
			scope: constants.logScopes.queue,
			data: { error },
		});
		process.exit(1);
	}
};

startConsumer();
