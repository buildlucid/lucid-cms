import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { logger } from "@lucidcms/core";
import { copy } from "@lucidcms/core/plugin";
import { insertJobs, logScope } from "@lucidcms/core/queue";
import type { QueueAdapterInstance } from "@lucidcms/core/types";

const ADAPTER_KEY = "worker";

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
	const checkNow = () => worker?.postMessage({ type: "CHECK_NOW" });

	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		support: {
			scheduling: true,
		},
		lifecycle: {
			init: async (params) => {
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
			destroy: async () => {
				if (worker) {
					worker.terminate();
				}
			},
		},
		add: async (event, params) => {
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

			const createJobRes = await insertJobs(params.context, {
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
		addBatch: async (event, params) => {
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

			const createJobsRes = await insertJobs(params.context, {
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
