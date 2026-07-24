import path from "node:path";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import { logger } from "@lucidcms/core";
import {
	getConfigPath,
	loadBuildProject,
	resolveConfigDefinition,
} from "@lucidcms/core/build";
import {
	destroyEmailAdapter,
	getInitializedEmailAdapter,
} from "@lucidcms/core/email";
import { destroyKVAdapter, getInitializedKVAdapter } from "@lucidcms/core/kv";
import {
	destroyMediaAdapter,
	getInitializedMediaAdapter,
} from "@lucidcms/core/media";
import {
	executeSingleJob,
	logScope,
	passthroughQueueAdapter,
	QueueJobsRepository,
} from "@lucidcms/core/queue";
import {
	createServiceContext,
	prepareTranslations,
} from "@lucidcms/core/runtime";
import type {
	AdapterLifecycleContext,
	AdapterRuntimeContext,
	Config,
	DatabaseConnection,
	EmailAdapterInstance,
	EnvironmentVariables,
	KVAdapterInstance,
	MediaAdapterInstance,
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
	runtimeContext: AdapterRuntimeContext | undefined;
}> => {
	try {
		const configPath = getConfigPath(process.cwd());
		const result = await loadBuildProject({
			configPath,
			silent: true,
			generateTypes: false,
			loadEmailTemplates: false,
		});
		return {
			config: result.loaded.config,
			translationStore: result.loaded.translationStore,
			env: result.loaded.env,
			runtimeContext: result.loaded.runtimeContext,
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
			runtimeContext: resolved.runtimeContext,
		};
	}
};

const startConsumer = async () => {
	let kvInstance: KVAdapterInstance | undefined;
	let mediaInstance: MediaAdapterInstance | null | undefined;
	let emailInstance: EmailAdapterInstance | undefined;
	let adapterLifecycleContext: AdapterLifecycleContext | undefined;
	let database: DatabaseConnection | undefined;

	try {
		const { config, translationStore, env, runtimeContext } = await getConfig();

		adapterLifecycleContext = {
			config,
			env,
			runtimeContext,
			purpose: "queue-consumer",
		};

		kvInstance = await getInitializedKVAdapter(config, {
			env,
			runtimeContext,
		});
		mediaInstance = await getInitializedMediaAdapter(config, {
			env,
			runtimeContext,
		});
		emailInstance = await getInitializedEmailAdapter(config, {
			env,
			runtimeContext,
			purpose: "queue-consumer",
		});
		const kv = kvInstance;
		const media = mediaInstance;
		const email = emailInstance;

		const internalQueueAdapter = passthroughQueueAdapter({
			bypassImmediateExecution: true,
		});
		database = await config.db.connect(env);

		const serviceContext = createServiceContext({
			config,
			database: database,
			translationStore,
			env,
			runtimeContext,
			queue: internalQueueAdapter,
			kv,
			media,
			email,
		});

		const QueueJobs = new QueueJobsRepository(database.client, config.db);

		// -----------------------------------------
		// Polling
		let pollInterval = MIN_POLL_INTERVAL;
		let pollTimeout: ReturnType<typeof setTimeout> | undefined;
		let pollPromise: Promise<void> | undefined;
		let pollRequested = false;
		let shuttingDown = false;
		let shutdownPromise: Promise<void> | undefined;

		const shutdown = (options: {
			exitCode?: number;
			notifyParent?: boolean;
		}) => {
			shutdownPromise ??= (async () => {
				shuttingDown = true;
				if (pollTimeout) {
					clearTimeout(pollTimeout);
					pollTimeout = undefined;
				}
				if (pollPromise) await Promise.allSettled([pollPromise]);
				if (adapterLifecycleContext) {
					await Promise.allSettled([
						database?.destroy(),
						destroyKVAdapter(kvInstance, adapterLifecycleContext),
						destroyMediaAdapter(mediaInstance, adapterLifecycleContext),
						destroyEmailAdapter(emailInstance, adapterLifecycleContext),
					]);
				}

				await logger.flush();
				if (options.notifyParent) {
					parentPort?.postMessage({ type: "SHUTDOWN_COMPLETE" });
					parentPort?.close();
				}
				if (options.exitCode !== undefined) process.exit(options.exitCode);
			})();
			return shutdownPromise;
		};

		process.once("SIGINT", () => {
			void shutdown({ exitCode: 0 });
		});
		process.once("SIGTERM", () => {
			void shutdown({ exitCode: 0 });
		});

		/**
		 * Polls for jobs and processes them
		 */
		const poll = (): Promise<void> => {
			if (pollPromise) {
				pollRequested = true;
				return pollPromise;
			}

			pollPromise = (async () => {
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
							error: jobsResult.error,
							event: "worker-queue.poll.query.failed",
							message: "Error getting ready jobs",
							scope: logScope,
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
									executeSingleJob(serviceContext, {
										jobId: job.job_id,
										event: job.event_type,
										payload: job.event_data,
										attempts: job.attempts,
										maxAttempts: job.max_attempts,
									}),
								),
							);
						}
					}
				} catch (error) {
					logger.error({
						error,
						event: "worker-queue.poll.failed",
						message: "Polling error",
						scope: logScope,
					});
				}
			})().finally(() => {
				pollPromise = undefined;
				if (!shuttingDown) {
					if (pollRequested) {
						pollRequested = false;
						void poll();
					} else {
						pollTimeout = setTimeout(() => {
							pollTimeout = undefined;
							void poll();
						}, pollInterval);
					}
				}
			});
			return pollPromise;
		};

		const checkNow = () => {
			if (shuttingDown) return;

			if (pollTimeout) {
				clearTimeout(pollTimeout);
				pollTimeout = undefined;
			}

			if (pollPromise) {
				pollRequested = true;
				return;
			}

			void poll();
		};

		parentPort?.on("message", ({ type }) => {
			if (type === "CHECK_NOW") checkNow();
			if (type === "SHUTDOWN") {
				void shutdown({ notifyParent: true });
			}
		});

		logger.debug({
			message: "Starting queue polling",
			scope: logScope,
		});
		checkNow();
	} catch (error) {
		if (adapterLifecycleContext) {
			await Promise.allSettled([
				database?.destroy(),
				destroyKVAdapter(kvInstance, adapterLifecycleContext),
				destroyMediaAdapter(mediaInstance, adapterLifecycleContext),
				destroyEmailAdapter(emailInstance, adapterLifecycleContext),
			]);
		}
		logger.error({
			error,
			event: "worker-queue.consumer.startup.failed",
			message: "Consumer startup error",
			scope: logScope,
		});
		await logger.flush();
		process.exit(1);
	}
};

startConsumer();
