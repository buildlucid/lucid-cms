import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { copy, LucidError, logger } from "@lucidcms/core";
import { logScopes } from "@lucidcms/core/extension";
import type { QueueAdapterInstance } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { WorkerQueueAdapterOptions } from "../types.js";
import resolveWorkerConsumerUrl from "../utils/resolve-worker-consumer-url.js";
import validateOptions from "../utils/validate-options.js";
import { relayWorkerLog } from "./worker-logging.js";

const ADAPTER_KEY = "worker";
const SHUTDOWN_TIMEOUT = 5_000;
const MAX_RESTART_DELAY = 30_000;
const RESTART_ATTEMPT_RESET_DELAY = 30_000;

/** Creates the database polling queue adapter. */
const workerQueueAdapter = (
	options: WorkerQueueAdapterOptions = {},
): QueueAdapterInstance => {
	validateOptions(options);
	let worker: Worker | null = null;
	let restartTimer: ReturnType<typeof setTimeout> | undefined;
	let restartAttempts = 0;
	let stopping = false;
	let destroyPromise: Promise<void> | undefined;

	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		support: { delayedDelivery: true, maxDelayMs: null },
		lifecycle: {
			init: async (params) => {
				if (!params.runtimeContext?.configEntryPoint) {
					throw new LucidError({
						message:
							"The worker queue needs a runtime with a config entry point.",
					});
				}

				stopping = false;
				destroyPromise = undefined;
				const workerData = {
					options,
					runtime: {
						configEntryPath: join(
							params.config.build.outDir,
							params.runtimeContext.configEntryPoint,
						),
						env: params.env,
					},
				};

				const startWorker = () => {
					if (stopping) return;

					const nextWorker = new Worker(resolveWorkerConsumerUrl(), {
						workerData,
					});
					worker = nextWorker;

					nextWorker.on("message", relayWorkerLog);

					const restartAttemptResetTimer = setTimeout(() => {
						if (worker === nextWorker) restartAttempts = 0;
					}, RESTART_ATTEMPT_RESET_DELAY);

					nextWorker.on("error", (error) => {
						logger.error({
							error,
							event: "worker-queue.consumer.error",
							message: "The worker queue consumer failed",
							owner: PLUGIN_KEY,
							scope: logScopes.queueAdapter,
						});
					});
					nextWorker.on("exit", (code) => {
						clearTimeout(restartAttemptResetTimer);
						if (worker === nextWorker) worker = null;
						if (stopping) return;

						restartAttempts += 1;
						const delay = Math.min(
							1_000 * 2 ** (restartAttempts - 1),
							MAX_RESTART_DELAY,
						);

						logger.warn({
							message: "The worker queue consumer exited and will restart",
							owner: PLUGIN_KEY,
							scope: logScopes.queueAdapter,
							data: { code, delay },
						});
						restartTimer = setTimeout(startWorker, delay);
					});
				};

				startWorker();
				logger.debug({
					message: "The worker queue has started",
					owner: PLUGIN_KEY,
					scope: logScopes.queueAdapter,
				});
			},
			destroy: () => {
				destroyPromise ??= (async () => {
					stopping = true;
					if (restartTimer) clearTimeout(restartTimer);
					restartTimer = undefined;
					const activeWorker = worker;
					worker = null;
					if (!activeWorker) return;

					await new Promise<void>((resolve) => {
						let settled = false;

						const finish = () => {
							if (settled) return;
							settled = true;
							clearTimeout(timeout);
							activeWorker.off("exit", finish);
							activeWorker.off("message", handleMessage);
							void activeWorker.terminate().finally(resolve);
						};
						const handleMessage = (message: { type?: string }) => {
							if (message.type === "SHUTDOWN_COMPLETE") finish();
						};

						const timeout = setTimeout(finish, SHUTDOWN_TIMEOUT);

						activeWorker.once("exit", finish);
						activeWorker.on("message", handleMessage);

						try {
							activeWorker.postMessage({ type: "SHUTDOWN" });
						} catch {
							finish();
						}
					});
				})();

				return destroyPromise;
			},
		},
		publish: async () => {
			try {
				worker?.postMessage({ type: "CHECK_NOW" });
				return { error: undefined, data: undefined };
			} catch (cause) {
				return {
					error: {
						message: copy("server:plugin.worker.queues.jobs.check.failed"),
						cause,
					},
					data: undefined,
				};
			}
		},
	};
};

export default workerQueueAdapter;
