import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { logger } from "@lucidcms/core";
import { logScope } from "@lucidcms/core/queue";
import type { QueueAdapterInstance } from "@lucidcms/core/types";
import type { WorkerQueueAdapterOptions } from "../types.js";
import resolveWorkerConsumerUrl from "../utils/resolve-worker-consumer-url.js";
import validateOptions from "../utils/validate-options.js";

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
		support: { scheduling: true, maxDelayMs: null },
		lifecycle: {
			init: async (params) => {
				if (!params.runtimeContext?.configEntryPoint) {
					throw new Error(
						"configEntryPoint is required. Your runtime likely does not support this queue adapter.",
					);
				}

				stopping = false;
				destroyPromise = undefined;
				const workerData = {
					options,
					runtime: {
						configEntryPath: join(
							params.config.build.paths.outDir,
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

					const restartAttemptResetTimer = setTimeout(() => {
						if (worker === nextWorker) restartAttempts = 0;
					}, RESTART_ATTEMPT_RESET_DELAY);

					nextWorker.on("error", (error) => {
						logger.error({
							error,
							event: "worker-queue.consumer.error",
							message: "The worker queue consumer failed",
							scope: logScope,
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
							scope: logScope,
							data: { code, delay },
						});
						restartTimer = setTimeout(startWorker, delay);
					});
				};

				startWorker();
				logger.debug({
					message: "The worker queue has started",
					scope: logScope,
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
			worker?.postMessage({ type: "CHECK_NOW" });
		},
	};
};

export default workerQueueAdapter;
