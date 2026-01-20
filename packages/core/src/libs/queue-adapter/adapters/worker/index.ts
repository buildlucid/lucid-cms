import { join } from "node:path";
import { Worker } from "node:worker_threads";
import constants from "../../../../constants/constants.js";
import logger from "../../../logger/index.js";
import { insertJobs } from "../../insert-job.js";
import type { QueueAdapterInstance } from "../../types.js";

const ADAPTER_KEY = "worker";

export type WorkerQueueAdapterOptions = {
	concurrentLimit?: number;
	batchSize?: number;
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

	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		lifecycle: {
			init: async (params) => {
				logger.debug({
					message: "The worker queue has started",
					scope: constants.logScopes.queueAdapter,
				});
				if (!params.runtimeContext.configEntryPoint) {
					throw new Error(
						"configEntryPoint is required. Your runtime likely does not support this queue adapter.",
					);
				}

				const configEntryPath = join(
					params.config.build.paths.outDir,
					params.runtimeContext.configEntryPoint,
				);

				const workerUrl = new URL("./consumer.mjs", import.meta.url);
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
					error: { message: "Worker queue is not started" },
					data: undefined,
				};
			}

			logger.info({
				message: "Adding job to the worker queue",
				scope: constants.logScopes.queueAdapter,
				data: { event },
			});

			const createJobRes = await insertJobs(params.serviceContext, {
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
						message: "Failed to create job",
					},
					data: undefined,
				};
			}

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
					error: { message: "Worker queue is not started" },
					data: undefined,
				};
			}

			logger.info({
				message: "Adding batch jobs to the worker queue",
				scope: constants.logScopes.queueAdapter,
				data: { event, count: params.payloads.length },
			});

			const createJobsRes = await insertJobs(params.serviceContext, {
				event,
				payloads: params.payloads,
				options: params.options,
				adapterKey: ADAPTER_KEY,
			});
			if (createJobsRes.error) return createJobsRes;

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
