import { randomUUID } from "node:crypto";
import constants from "../../constants/constants.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import logger from "../logger/index.js";
import Repository from "../repositories/index.js";
import queueJobHandlers from "./job-handlers.js";
import type {
	QueueBatchJobResponse,
	QueueEvent,
	QueueJobHandlers,
	QueueJobOptions,
	QueueJobResponse,
} from "./types.js";

export const QUEUE_LOG_SCOPE = "queue" as const;

/**
 * Responsible for creating the context for the queue adapters.
 */
const createQueueContext = (params?: {
	additionalJobHandlers?: QueueJobHandlers;
}) => {
	const jobHandlers = queueJobHandlers({
		additionalHandlers: params?.additionalJobHandlers,
	});

	return {
		/**
		 * Responsible for adding a job to the queue.
		 * - Inserts job into the database
		 * - Logs the job
		 * */
		insertJob: async (
			serviceContext: ServiceContext,
			data: {
				event: QueueEvent;
				payload: Record<string, unknown>;
				queueAdapterKey: string;
				options?: QueueJobOptions;
			},
		): ServiceResponse<QueueJobResponse> => {
			try {
				const jobId = randomUUID();
				const now = new Date();
				const status = "pending";
				const QueueJobs = Repository.get(
					"queue-jobs",
					serviceContext.db,
					serviceContext.config.db,
				);

				const createJobRes = await QueueJobs.createSingle({
					data: {
						job_id: jobId,
						event_type: data.event,
						event_data: data.payload,
						status: status,
						queue_adapter_key: data.queueAdapterKey,
						priority: data.options?.priority ?? 0,
						attempts: 0,
						max_attempts:
							data.options?.maxAttempts ?? constants.queue.maxAttempts,
						error_message: null,
						created_at: now.toISOString(),
						scheduled_for: data.options?.scheduledFor
							? data.options.scheduledFor.toISOString()
							: undefined,
						created_by_user_id: data.options?.createdByUserId ?? null,
						updated_at: now.toISOString(),
					},
					returning: ["id"],
				});
				if (createJobRes.error) return createJobRes;

				return {
					error: undefined,
					data: { jobId, event: data.event, status },
				};
			} catch (error) {
				logger.error({
					message: "Error adding event to the queue",
					scope: QUEUE_LOG_SCOPE,
					data: {
						errorMessage:
							error instanceof Error ? error.message : String(error),
						errorStack: error instanceof Error ? error.stack : undefined,
						error,
					},
				});

				return {
					error: { message: "Error adding event to the queue" },
					data: undefined,
				};
			}
		},
		/**
		 * Responsible for adding multiple jobs of the same type to the queue.
		 * - Inserts multiple jobs into the database in a single operation
		 * - Logs the jobs
		 * */
		insertMultipleJobs: async (
			serviceContext: ServiceContext,
			data: {
				event: QueueEvent;
				payloads: Record<string, unknown>[];
				queueAdapterKey: string;
				options?: QueueJobOptions;
			},
		): ServiceResponse<QueueBatchJobResponse> => {
			try {
				const now = new Date();
				const status = "pending";
				const QueueJobs = Repository.get(
					"queue-jobs",
					serviceContext.db,
					serviceContext.config.db,
				);

				// Generate job IDs for all jobs
				const jobsData = data.payloads.map((payload) => ({
					jobId: randomUUID(),
					payload,
				}));

				const createJobsRes = await QueueJobs.createMultiple({
					data: jobsData.map((job) => ({
						job_id: job.jobId,
						event_type: data.event,
						event_data: job.payload,
						status: status,
						queue_adapter_key: data.queueAdapterKey,
						priority: data.options?.priority ?? 0,
						attempts: 0,
						max_attempts:
							data.options?.maxAttempts ?? constants.queue.maxAttempts,
						error_message: null,
						created_at: now.toISOString(),
						scheduled_for: data.options?.scheduledFor
							? data.options.scheduledFor.toISOString()
							: undefined,
						created_by_user_id: data.options?.createdByUserId ?? null,
						updated_at: now.toISOString(),
					})),
					returning: ["id"],
				});
				if (createJobsRes.error) return createJobsRes;

				return {
					error: undefined,
					data: {
						jobIds: jobsData.map((j) => j.jobId),
						event: data.event,
						status,
						count: jobsData.length,
					},
				};
			} catch (error) {
				logger.error({
					message: "Error adding batch events to the queue",
					scope: QUEUE_LOG_SCOPE,
					data: {
						errorMessage:
							error instanceof Error ? error.message : String(error),
						errorStack: error instanceof Error ? error.stack : undefined,
						error,
					},
				});

				return {
					error: { message: "Error adding batch events to the queue" },
					data: undefined,
				};
			}
		},
		/**
		 * Responsible for getting the job handlers
		 */
		getJobHandlers: jobHandlers,
		/**
		 * The log scope for the queue
		 */
		logScope: QUEUE_LOG_SCOPE,
	};
};

export default createQueueContext;
