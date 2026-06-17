import path from "node:path";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import { logger } from "@lucidcms/core";
import {
	getConfigPath,
	loadBuildProject,
	resolveConfigDefinition,
} from "@lucidcms/core/build";
import { destroyKVAdapter, getInitializedKVAdapter } from "@lucidcms/core/kv";
import { createTranslator } from "@lucidcms/core/plugin";
import {
	executeSingleJob,
	logScope,
	passthroughQueueAdapter,
	QueueJobsRepository,
} from "@lucidcms/core/queue";
import { prepareTranslations } from "@lucidcms/core/runtime";
import type {
	Config,
	EnvironmentVariables,
	KVAdapterInstance,
	TranslationStore,
} from "@lucidcms/core/types";
import type { WorkerQueueAdapterOptions } from "./index.js";

const MIN_POLL_INTERVAL = 1000;
const MAX_POLL_INTERVAL = 30000;
const POLL_INTERVAL_INC = 1000;
const DEFAULT_CONCURRENT_LIMIT = 5;
const DEFAULT_BATCH_SIZE = 10;

const options = workerData.options as WorkerQueueAdapterOptions;
const runtime = workerData.runtime as {
	configEntryPath: string;
	env: EnvironmentVariables | undefined;
};

const CONCURRENT_LIMIT = options.concurrentLimit ?? DEFAULT_CONCURRENT_LIMIT;
const BATCH_SIZE = options.batchSize ?? DEFAULT_BATCH_SIZE;

/**
 * Attempts to load the config through jiti if it exists.
 * Otherwise, we're likely in a production environment, in which try and load the config through the runtime's built config output.
 */
const getConfig = async (): Promise<{
	config: Config;
	translationStore: TranslationStore;
	env: EnvironmentVariables | undefined;
}> => {
	try {
		const configPath = getConfigPath(process.cwd());
		const result = await loadBuildProject({
			configPath,
			silent: true,
			generateTypes: false,
			renderEmailTemplates: false,
		});
		return {
			config: result.loaded.config,
			translationStore: result.loaded.translationStore,
			env: result.loaded.env,
		};
	} catch (_) {
		const configPath = path.resolve(process.cwd(), runtime.configEntryPath);
		const configDir = path.dirname(configPath);

		const [configModule, envModule, dbModule, runtimeModule] =
			await Promise.all([
				import(pathToFileURL(configPath).href),
				import(pathToFileURL(path.join(configDir, "env.js")).href),
				import(pathToFileURL(path.join(configDir, "db.js")).href),
				import(pathToFileURL(path.join(configDir, "runtime.js")).href),
			]);

		const resolved = await resolveConfigDefinition({
			definition: {
				runtime: runtimeModule.default,
				db: dbModule.default,
				config: configModule.default,
			},
			envSchema: envModule.env,
			env: runtime.env,
			processConfigOptions: {
				bypassCache: true,
				skipValidation: true,
			},
		});
		const translationsModule = await import(
			pathToFileURL(
				path.join(path.dirname(configDir), "i18n-translations.json"),
			).href,
			{ with: { type: "json" } }
		);
		const translations = await prepareTranslations({
			config: resolved.config,
			bundles: translationsModule.default,
		});

		return {
			config: resolved.config,
			translationStore: translations.translationStore,
			env: resolved.env,
		};
	}
};

const startConsumer = async () => {
	let kvInstance: KVAdapterInstance | undefined;
	let kvLifecycleContext:
		| {
				config: Config;
				env?: EnvironmentVariables;
		  }
		| undefined;
	try {
		const { config, translationStore, env } = await getConfig();
		const translate = createTranslator({
			store: translationStore,
			locale: "en",
		});
		kvLifecycleContext = { config, env };

		kvInstance = await getInitializedKVAdapter(config, {
			env,
		});
		const kv = kvInstance;

		const internalQueueAdapter = passthroughQueueAdapter({
			bypassImmediateExecution: true,
		});

		const QueueJobs = new QueueJobsRepository(config.db.client, config.db);

		// -----------------------------------------
		// Polling
		let pollInterval = MIN_POLL_INTERVAL;
		let pollTimeout: ReturnType<typeof setTimeout> | undefined;
		let isPolling = false;
		let pollRequested = false;
		let shuttingDown = false;

		const shutdown = async (exitCode: number) => {
			if (shuttingDown) return;
			shuttingDown = true;
			if (pollTimeout) clearTimeout(pollTimeout);
			if (kvLifecycleContext)
				await destroyKVAdapter(kvInstance, kvLifecycleContext);
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
			if (isPolling) {
				pollRequested = true;
				return;
			}

			isPolling = true;
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
						scope: logScope,
						data: { error: jobsResult.error },
					});
					return;
				}

				logger.debug({
					message: "Jobs found",
					scope: logScope,
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
										translate,
										request: {
											url: config.baseUrl ?? "",
											locale: "en",
										},
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
					scope: logScope,
					data: { error },
				});
			} finally {
				isPolling = false;

				if (!shuttingDown) {
					if (pollRequested) {
						pollRequested = false;
						void poll();
					} else {
						pollTimeout = setTimeout(poll, pollInterval);
					}
				}
			}
		};

		const checkNow = () => {
			if (shuttingDown) return;

			if (pollTimeout) {
				clearTimeout(pollTimeout);
				pollTimeout = undefined;
			}

			if (isPolling) {
				pollRequested = true;
				return;
			}

			void poll();
		};

		parentPort?.on("message", ({ type }) => {
			if (type === "CHECK_NOW") checkNow();
		});

		logger.debug({
			message: "Starting queue polling",
			scope: logScope,
		});
		checkNow();
	} catch (error) {
		if (kvLifecycleContext)
			await destroyKVAdapter(kvInstance, kvLifecycleContext);
		logger.error({
			message: "Consumer startup error",
			scope: logScope,
			data: { error },
		});
		process.exit(1);
	}
};

startConsumer();
