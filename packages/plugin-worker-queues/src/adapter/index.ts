import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { logger } from "@lucidcms/core";
import { copy } from "@lucidcms/core/plugin";
import { insertJobs, logScope } from "@lucidcms/core/queue";
import type { QueueAdapterInstance } from "@lucidcms/core/types";

const ADAPTER_KEY = "worker";
const SHUTDOWN_TIMEOUT = 5000;

export type WorkerQueueAdapterOptions = {
	concurrentLimit?: number;
	batchSize?: number;
};

const resolveWorkerConsumerUrl = (): URL => {
	const localConsumerUrl = new URL("./consumer.mjs", import.meta.url);

	try {
		const require = createRequire(import.meta.url);
		const packageJsonPath = require.resolve(
			"@lucidcms/plugin-worker-queues/package.json",
		);
		return pathToFileURL(
			join(dirname(packageJsonPath), "dist", "adapter", "consumer.mjs"),
		);
	} catch {
		return localConsumerUrl;
	}
};

/**
 * The worker queue adapter
 */
function workerQueueAdapter(): QueueAdapterInstance;
function workerQueueAdapter(
	options: WorkerQueueAdapterOptions,
): QueueAdapterInstance;
function workerQueueAdapter(
	options: WorkerQueueAdapterOptions = {},
): QueueAdapterInstance {
	let worker: Worker | null = null;
	let destroyPromise: Promise<void> | undefined;
	const checkNow = () => worker?.postMessage({ type: "CHECK_NOW" });

	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		support: {
			scheduling: true,
		},
		lifecycle: {
			init: async (params) => {
				destroyPromise = undefined;
				logger.debug({
					message: "The worker queue has started",
					scope: logScope,
				});
				if (!params.runtimeContext?.configEntryPoint) {
					throw new Error(
						"configEntryPoint is required. Your runtime likely does not support this queue adapter.",
					);
				}

				const configEntryPath = join(
					params.config.build.paths.outDir,
					params.runtimeContext.configEntryPoint,
				);

				const workerUrl = resolveWorkerConsumerUrl();
				worker = new Worker(workerUrl, {
					workerData: {
						options: {
							concurrentLimit: options.concurrentLimit,
							batchSize: options.batchSize,
						},
						runtime: {
							configEntryPath: configEntryPath,
							env: params.env,
						},
					},
				});
			},
			destroy: () => {
				destroyPromise ??= (async () => {
					const activeWorker = worker;
					worker = null;
					if (!activeWorker) return;

					await new Promise<void>((resolve) => {
						let settled = false;
						const cleanup = () => {
							clearTimeout(timeout);
							activeWorker.off("exit", handleExit);
							activeWorker.off("message", handleMessage);
						};
						const finish = () => {
							if (settled) return;
							settled = true;
							cleanup();
							resolve();
						};
						const terminate = () => {
							if (settled) return;
							settled = true;
							cleanup();
							void activeWorker.terminate().then(
								() => resolve(),
								() => resolve(),
							);
						};
						const handleExit = () => finish();
						const handleMessage = (message: { type?: string }) => {
							if (message.type === "SHUTDOWN_COMPLETE") terminate();
						};
						const timeout = setTimeout(terminate, SHUTDOWN_TIMEOUT);

						activeWorker.once("exit", handleExit);
						activeWorker.on("message", handleMessage);
						try {
							activeWorker.postMessage({ type: "SHUTDOWN" });
						} catch {
							terminate();
						}
					});
				})();
				return destroyPromise;
			},
		},
		add: async (context, params) => {
			const { event } = params;
			if (!worker) {
				return {
					error: {
						message: copy("server:plugin.worker.queues.worker.not.started", {
							defaultMessage: "Worker queue is not started",
						}),
					},
					data: undefined,
				};
			}

			logger.info({
				message: "Adding job to the worker queue",
				scope: logScope,
				data: { event },
			});

			const createJobRes = await insertJobs(context, {
				event,
				payloads: [params.payload],
				options: params.options,
				adapterKey: ADAPTER_KEY,
			});
			if (createJobRes.error) return createJobRes;

			const jobData = createJobRes.data.jobs[0];
			if (!jobData) {
				return {
					error: {
						message: copy("server:plugin.worker.queues.jobs.create.failed", {
							defaultMessage: "Failed to create job",
						}),
					},
					data: undefined,
				};
			}

			checkNow();

			return {
				error: undefined,
				data: {
					jobId: jobData.jobId,
					event,
					status: createJobRes.data.status,
				},
			};
		},
		addBatch: async (context, params) => {
			const { event } = params;
			if (!worker) {
				return {
					error: {
						message: copy("server:plugin.worker.queues.worker.not.started", {
							defaultMessage: "Worker queue is not started",
						}),
					},
					data: undefined,
				};
			}

			logger.info({
				message: "Adding batch jobs to the worker queue",
				scope: logScope,
				data: { event, count: params.payloads.length },
			});

			const createJobsRes = await insertJobs(context, {
				event,
				payloads: params.payloads,
				options: params.options,
				adapterKey: ADAPTER_KEY,
			});
			if (createJobsRes.error) return createJobsRes;

			checkNow();

			return {
				error: undefined,
				data: {
					jobIds: createJobsRes.data.jobs.map((j) => j.jobId),
					event,
					status: createJobsRes.data.status,
					count: createJobsRes.data.jobs.length,
				},
			};
		},
	};
}

export default workerQueueAdapter;
