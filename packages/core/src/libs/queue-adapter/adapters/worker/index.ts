import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import constants from "../../../../constants/constants.js";
import logger from "../../../logger/index.js";
import { QueueJobsRepository } from "../../../repositories/index.js";
import type {
	QueueAdapterInstance,
	QueueBatchJobResponse,
	QueueJobResponse,
} from "../../types.js";
import { join } from "node:path";

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
					params.config.compilerOptions.paths.outDir,
					params.runtimeContext.configEntryPoint,
				);

				const workerUrl = new URL("./consumer.js", import.meta.url);
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
		command: {
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

				const jobId = randomUUID();
				const now = new Date();
				const status: QueueJobResponse["status"] = "pending";
				const QueueJobs = new QueueJobsRepository(
					params.serviceContext.db,
					params.serviceContext.config.db,
				);

				const createJobRes = await QueueJobs.createSingle({
					data: {
						job_id: jobId,
						event_type: event,
						event_data: params.payload,
						status: status,
						queue_adapter_key: ADAPTER_KEY,
						priority: params.options?.priority ?? 0,
						attempts: 0,
						max_attempts:
							params.options?.maxAttempts ?? constants.queue.maxAttempts,
						error_message: null,
						created_at: now.toISOString(),
						scheduled_for: params.options?.scheduledFor
							? params.options.scheduledFor.toISOString()
							: undefined,
						created_by_user_id: params.options?.createdByUserId ?? null,
						updated_at: now.toISOString(),
					},
					returning: ["id"],
				});
				if (createJobRes.error) return createJobRes;

				return {
					error: undefined,
					data: { jobId, event, status },
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

				const now = new Date();
				const status: QueueBatchJobResponse["status"] = "pending";
				const QueueJobs = new QueueJobsRepository(
					params.serviceContext.db,
					params.serviceContext.config.db,
				);

				const jobsData = params.payloads.map((payload) => ({
					jobId: randomUUID(),
					payload,
				}));

				const createJobsRes = await QueueJobs.createMultiple({
					data: jobsData.map((job) => ({
						job_id: job.jobId,
						event_type: event,
						event_data: job.payload,
						status: status,
						queue_adapter_key: ADAPTER_KEY,
						priority: params.options?.priority ?? 0,
						attempts: 0,
						max_attempts:
							params.options?.maxAttempts ?? constants.queue.maxAttempts,
						error_message: null,
						created_at: now.toISOString(),
						scheduled_for: params.options?.scheduledFor
							? params.options.scheduledFor.toISOString()
							: undefined,
						created_by_user_id: params.options?.createdByUserId ?? null,
						updated_at: now.toISOString(),
					})),
					returning: ["id"],
				});
				if (createJobsRes.error) return createJobsRes;

				return {
					error: undefined,
					data: {
						jobIds: jobsData.map((j) => j.jobId),
						event,
						status,
						count: jobsData.length,
					},
				};
			},
		},
	};
}

export default workerQueueAdapter;
