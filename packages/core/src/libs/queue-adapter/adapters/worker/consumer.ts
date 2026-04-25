import path from "node:path";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import constants from "../../../../constants/constants.js";
import type { Config } from "../../../../types.js";
import getConfigPath from "../../../config/get-config-path.js";
import loadConfigFile from "../../../config/load-config-file.js";
import { resolveConfigDefinition } from "../../../config/resolve-config-definition.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../../kv-adapter/lifecycle.js";
import type { KVAdapterInstance } from "../../../kv-adapter/types.js";
import logger from "../../../logger/index.js";
import { QueueJobsRepository } from "../../../repositories/index.js";
import type { EnvironmentVariables } from "../../../runtime-adapter/types.js";
import executeSingleJob from "../../execute-single-job.js";
import passthroughQueueAdapter from "../passthrough.js";
import type { WorkerQueueAdapterOptions } from "./index.js";

const MIN_POLL_INTERVAL = 1000;
const MAX_POLL_INTERVAL = 30000;
const POLL_INTERVAL_INC = 1000;

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
		const result = await loadConfigFile({
			path: configPath,
			silent: true,
			processConfigOptions: {
				skipValidation: true,
			},
		});
		return {
			config: result.config,
			env: result.env,
		};
	} catch (_) {
		const configPath = path.resolve(process.cwd(), runtime.configEntryPath);
		const configUrl = pathToFileURL(configPath).href;

		const configModule = await import(configUrl);

		const resolved = await resolveConfigDefinition({
			definition: configModule.default,
			env: runtime.env,
			processConfigOptions: {
				bypassCache: true,
				skipValidation: true,
			},
		});

		return {
			config: resolved.config,
			env: resolved.env,
		};
	}
};

const startConsumer = async () => {
	let kvInstance: KVAdapterInstance | undefined;
	try {
		const { config, env } = await getConfig();

		kvInstance = await getInitializedKVAdapter(config);
		const kv = kvInstance;

		const internalQueueAdapter = passthroughQueueAdapter({
			bypassImmediateExecution: true,
		});

		const QueueJobs = new QueueJobsRepository(config.db.client, config.db);

		// -----------------------------------------
		// Polling
		let pollInterval = MIN_POLL_INTERVAL;
		let pollTimeout: ReturnType<typeof setTimeout> | undefined;
		let shuttingDown = false;

		const shutdown = async (exitCode: number) => {
			if (shuttingDown) return;
			shuttingDown = true;
			if (pollTimeout) clearTimeout(pollTimeout);
			await destroyKVAdapter(kvInstance);
			await config.db.client.destroy();
			process.exit(exitCode);
		};

		process.once("SIGINT", () => {
			void shutdown(0);
		});
		process.once("SIGTERM", () => {
			void shutdown(0);
		});

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
						scope: constants.logScopes.queueAdapter,
						data: { error: jobsResult.error },
					});
					return;
				}

				logger.debug({
					message: "Jobs found",
					scope: constants.logScopes.queueAdapter,
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
						await Promise.allSettled(
							chunk.map((job) =>
								executeSingleJob(
									{
										config: config,
										db: { client: config.db.client },
										env: env ?? null,
										// TODO: should handlers be able to push jobs to the queue??
										//* we use the passthrough queue adapter so that any services called within the handler can still push events to the queue.
										//* with bypassImmediateExecution set to true so that the events are not executed immediately like they would by default with this adapter
										queue: internalQueueAdapter,
										kv,
										requestUrl: config.baseUrl ?? "",
									},
									{
										jobId: job.job_id,
										event: job.event_type,
										payload: job.event_data,
										attempts: job.attempts,
										maxAttempts: job.max_attempts,
									},
								),
							),
						);
					}
				}
			} catch (error) {
				logger.error({
					message: "Polling error",
					scope: constants.logScopes.queueAdapter,
					data: { error },
				});
			}

			if (!shuttingDown) {
				pollTimeout = setTimeout(poll, pollInterval);
			}
		};

		parentPort?.on("message", ({ type }) => {
			if (type === "CHECK_NOW" && !shuttingDown) poll();
		});

		logger.debug({
			message: "Starting queue polling",
			scope: constants.logScopes.queueAdapter,
		});
		poll();
	} catch (error) {
		await destroyKVAdapter(kvInstance);
		logger.error({
			message: "Consumer startup error",
			scope: constants.logScopes.queueAdapter,
			data: { error },
		});
		process.exit(1);
	}
};

startConsumer();
