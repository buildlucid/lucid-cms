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
	destroyMediaDeliveryAdapter,
	getInitializedMediaDeliveryAdapter,
} from "@lucidcms/core/media-delivery";
import {
	destroyMediaStorageAdapter,
	getInitializedMediaStorageAdapter,
} from "@lucidcms/core/media-storage";
import { drainJobs, logScope } from "@lucidcms/core/queue";
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
	MediaDeliveryAdapterInstance,
	MediaStorageAdapterInstance,
	QueueAdapterInstance,
	TranslationStore,
} from "@lucidcms/core/types";
import type { WorkerQueueAdapterOptions } from "../types.js";

const MIN_POLL_INTERVAL = 1_000;
const MAX_POLL_INTERVAL = 30_000;
const POLL_INTERVAL_INC = 1_000;
const DEFAULT_CONCURRENT_LIMIT = 5;
const DEFAULT_BATCH_SIZE = 10;

const options = workerData.options as WorkerQueueAdapterOptions;
const runtime = workerData.runtime as {
	configEntryPath: string;
	env: EnvironmentVariables | undefined;
};

const CONCURRENT_LIMIT = options.concurrentLimit ?? DEFAULT_CONCURRENT_LIMIT;
const BATCH_SIZE = options.batchSize ?? DEFAULT_BATCH_SIZE;

/** Loads source config in development and compiled config in production. */
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
	let kvInstance: KVAdapterInstance | undefined;
	let mediaStorageInstance: MediaStorageAdapterInstance | null | undefined;
	let mediaDeliveryInstance: MediaDeliveryAdapterInstance | undefined;
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
		mediaStorageInstance = await getInitializedMediaStorageAdapter(config, {
			env,
			runtimeContext,
		});
		mediaDeliveryInstance = await getInitializedMediaDeliveryAdapter(config, {
			env,
			runtimeContext,
		});
		emailInstance = await getInitializedEmailAdapter(config, {
			env,
			runtimeContext,
			purpose: "queue-consumer",
		});
		const kv = kvInstance;
		const mediaStorage = mediaStorageInstance;
		const mediaDelivery = mediaDeliveryInstance;
		const email = emailInstance;

		let requestPoll: () => void = () => undefined;
		const internalQueueAdapter: QueueAdapterInstance = {
			type: "queue-adapter",
			key: "worker",
			support: { scheduling: true, maxDelayMs: null },
			publish: async () => requestPoll(),
		};
		database = await config.db.connect(env);

		const serviceContext = createServiceContext({
			config,
			database: database,
			translationStore,
			env,
			runtimeContext,
			queue: internalQueueAdapter,
			kv,
			mediaStorage,
			mediaDelivery,
			email,
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
				if (pollPromise) await Promise.allSettled([pollPromise]);
				if (adapterLifecycleContext) {
					await Promise.allSettled([
						database?.destroy(),
						destroyKVAdapter(kvInstance, adapterLifecycleContext),
						destroyMediaStorageAdapter(
							mediaStorageInstance,
							adapterLifecycleContext,
						),
						destroyMediaDeliveryAdapter(
							mediaDeliveryInstance,
							adapterLifecycleContext,
						),
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
						concurrentLimit: CONCURRENT_LIMIT,
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
		requestPoll = checkNow;

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
				destroyMediaStorageAdapter(
					mediaStorageInstance,
					adapterLifecycleContext,
				),
				destroyMediaDeliveryAdapter(
					mediaDeliveryInstance,
					adapterLifecycleContext,
				),
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
