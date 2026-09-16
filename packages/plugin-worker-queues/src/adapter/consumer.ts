import path from "node:path";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import {
	getConfigPath,
	loadBuildProject,
	resolveConfigDefinition,
} from "@lucidcms/core/build";
import { drainJobs, logScopes } from "@lucidcms/core/extension";
import {
	createLucidAdapters,
	createServiceContext,
	logger,
	prepareTranslations,
} from "@lucidcms/core/runtime";
import type {
	AdapterRuntimeContext,
	DatabaseConnection,
	EnvironmentVariables,
	LucidAdapters,
	QueueAdapterInstance,
	ResolvedLucidConfig,
	TranslationStore,
} from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { WorkerQueueAdapterOptions } from "../types.js";

const MIN_POLL_INTERVAL = 1_000;
const MAX_POLL_INTERVAL = 30_000;
const POLL_INTERVAL_INC = 1_000;
const DEFAULT_MAX_CONCURRENT_JOBS = 5;
const DEFAULT_BATCH_SIZE = 10;

const options = workerData.options as WorkerQueueAdapterOptions;
const runtime = workerData.runtime as {
	configEntryPath: string;
	env: EnvironmentVariables | undefined;
};

const MAX_CONCURRENT_JOBS =
	options.maxConcurrentJobs ?? DEFAULT_MAX_CONCURRENT_JOBS;
const BATCH_SIZE = options.batchSize ?? DEFAULT_BATCH_SIZE;

/** Loads source config in development and compiled config in production. */
const getConfig = async (): Promise<{
	config: ResolvedLucidConfig;
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
			validateEnv: true,
			loadEmailTemplates: false,
		});
		return {
			config: result.loaded.config,
			translationStore: result.loaded.translationStore,
			env: result.loaded.env,
			runtimeContext: result.loaded.runtimeContext,
		};
	} catch {
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
	let adapters: LucidAdapters | undefined;
	let database: DatabaseConnection | undefined;

	try {
		const { config, translationStore, env, runtimeContext } = await getConfig();

		let requestPoll: () => void = () => undefined;
		const internalQueueAdapter: QueueAdapterInstance = {
			type: "queue-adapter",
			key: "worker",
			support: { delayedDelivery: true, maxDelayMs: null },
			publish: async () => {
				requestPoll();
				return { error: undefined, data: undefined };
			},
		};
		adapters = await createLucidAdapters({
			config,
			env,
			runtimeContext,
			overrides: {
				queue: internalQueueAdapter,
			},
		});
		const activeAdapters = adapters;
		database = await config.db.connect(env);
		const activeDatabase = database;
		const serviceContext = createServiceContext({
			config,
			database: activeDatabase,
			translationStore,
			env,
			runtimeContext,
			...activeAdapters.instances,
		});

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
				if (pollPromise) await pollPromise;
				await activeAdapters.destroy();
				await activeDatabase.destroy();

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

		/** Polls for ready jobs and processes them within the configured limits. */
		const poll = (): Promise<void> => {
			if (pollPromise) {
				pollRequested = true;
				return pollPromise;
			}

			pollPromise = (async () => {
				try {
					const jobsResult = await drainJobs(serviceContext, {
						limit: BATCH_SIZE,
						maxConcurrentJobs: MAX_CONCURRENT_JOBS,
					});
					if (jobsResult.error) {
						logger.error({
							error: jobsResult.error,
							event: "worker-queue.poll.query.failed",
							message: "Error getting ready jobs",
							owner: PLUGIN_KEY,
							scope: logScopes.queueAdapter,
						});
						return;
					}

					logger.debug({
						message: "Jobs found",
						owner: PLUGIN_KEY,
						scope: logScopes.queueAdapter,
						data: { jobs: jobsResult.data.found },
					});

					// Slow polling down while the queue is empty.
					if (jobsResult.data.found === 0) {
						pollInterval = Math.min(
							pollInterval + POLL_INTERVAL_INC,
							MAX_POLL_INTERVAL,
						);
					} else {
						// Return to fast polling as soon as work appears.
						pollInterval = MIN_POLL_INTERVAL;
					}
				} catch (error) {
					logger.error({
						error,
						event: "worker-queue.poll.failed",
						message: "Polling error",
						owner: PLUGIN_KEY,
						scope: logScopes.queueAdapter,
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
		requestPoll = checkNow;

		parentPort?.on("message", ({ type }) => {
			if (type === "CHECK_NOW") checkNow();
			if (type === "SHUTDOWN") {
				void shutdown({ notifyParent: true });
			}
		});

		logger.debug({
			message: "Starting queue polling",
			owner: PLUGIN_KEY,
			scope: logScopes.queueAdapter,
		});
		checkNow();
	} catch (error) {
		logger.error({
			error,
			event: "worker-queue.consumer.startup.failed",
			message: "Consumer startup error",
			owner: PLUGIN_KEY,
			scope: logScopes.queueAdapter,
		});
		if (adapters) await adapters.destroy();
		if (database) await database.destroy();
		await logger.flush();
		process.exit(1);
	}
};

startConsumer();
