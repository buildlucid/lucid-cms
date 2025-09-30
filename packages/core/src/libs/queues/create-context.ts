import type {
	QueueEvent,
	QueueJobStatus,
	QueueJobResponse,
	QueueJobOptions,
	QueueJobHandlers,
} from "./types.js";
import { randomUUID } from "node:crypto";
import logger from "../logger/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import queueJobHandlers from "./job-handlers.js";
import Repository from "../repositories/index.js";
import type { LucidQueueJobs, Select } from "../db/types.js";

export const QUEUE_LOG_SCOPE = "queue" as const;

const BACKOFF_MULTIPLIER = 2;

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
		 * - If KV is enabled, then also inserts into the KV
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
				//* insert event into the database, if KV is enabled, then also insert into the KV
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
							data.options?.maxAttempts ??
							serviceContext.config.queue.defaultJobOptions.maxAttempts,
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

				// TODO: Insert into KV if configured
				// if (config.kv) {
				//   await config.kv.set(`job:${jobId}`, job);
				//   await config.kv.lpush('pending_jobs', jobId);
				// }

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
		 * Responsible for getting the job handlers
		 */
		getJobHandlers: jobHandlers,
		/**
		 * Responsible for getting the ready jobs
		 */
		getReadyJobs: async (
			serviceContext: ServiceContext,
		): ServiceResponse<Select<LucidQueueJobs>[]> => {
			try {
				const now = new Date();
				const QueueJobs = Repository.get(
					"queue-jobs",
					serviceContext.db,
					serviceContext.config.db,
				);

				// TODO: Add KV use here once its implemented

				const jobsRes = await QueueJobs.selectJobsForProcessing({
					limit: serviceContext.config.queue.processing.batchSize,
					currentTime: now,
					validation: {
						enabled: true,
					},
				});
				if (jobsRes.error) return jobsRes;

				return {
					error: undefined,
					data: jobsRes.data,
				};
			} catch (error) {
				logger.error({
					message: "Error getting jobs",
					scope: QUEUE_LOG_SCOPE,
					data: { error },
				});
				return {
					error: { message: "Error getting jobs" },
					data: undefined,
				};
			}
		},
		/**
		 * Responsible for updating a job
		 */
		updateJob: async (
			serviceContext: ServiceContext,
			data: {
				jobId: string;
				body: {
					status?: QueueJobStatus;
					attempts?: number;
					nextRetryAt?: Date | null;
					errorMessage?: string | null;
				};
			},
		): ServiceResponse<undefined> => {
			try {
				const dbUpdates: Record<string, unknown> = {
					updated_at: new Date().toISOString(),
				};
				const QueueJobs = Repository.get(
					"queue-jobs",
					serviceContext.db,
					serviceContext.config.db,
				);

				if (data.body.status) {
					dbUpdates.status = data.body.status;

					if (data.body.status === "processing") {
						dbUpdates.started_at = new Date().toISOString();
					} else if (data.body.status === "completed") {
						dbUpdates.completed_at = new Date().toISOString();
					} else if (data.body.status === "failed") {
						dbUpdates.failed_at = new Date().toISOString();
					}
				}

				if (data.body.attempts !== undefined) {
					dbUpdates.attempts = data.body.attempts;
				}
				if (data.body.nextRetryAt !== undefined) {
					dbUpdates.next_retry_at =
						data.body.nextRetryAt?.toISOString() || null;
				}
				if (data.body.errorMessage !== undefined) {
					dbUpdates.error_message = data.body.errorMessage;
				}

				const updateJobRes = await QueueJobs.updateSingle({
					data: dbUpdates,
					where: [
						{
							key: "job_id",
							operator: "=",
							value: data.jobId,
						},
					],
				});
				if (updateJobRes.error) return updateJobRes;

				return {
					error: undefined,
					data: undefined,
				};
			} catch (error) {
				logger.error({
					message: "Error updating job",
					scope: QUEUE_LOG_SCOPE,
					data: { error, jobId: data.jobId },
				});
				return {
					error: { message: "Error updating job" },
					data: undefined,
				};
			}
		},
		/**
		 * Responsible for handling a job failure
		 */
		handleJobFailure: async (
			serviceContext: ServiceContext,
			data: {
				job: {
					job_id: string;
					event_type: QueueEvent;
					attempts: number;
					max_attempts: number;
				};
				errorMessage: string;
			},
		): ServiceResponse<void> => {
			try {
				const shouldRetry = data.job.attempts < data.job.max_attempts;
				const QueueJobs = Repository.get(
					"queue-jobs",
					serviceContext.db,
					serviceContext.config.db,
				);

				const nextRetryAt = shouldRetry
					? new Date(
							Date.now() + BACKOFF_MULTIPLIER ** data.job.attempts * 1000,
						)
					: undefined;

				const updateJobRes = await QueueJobs.updateSingle({
					data: {
						status: shouldRetry ? "pending" : "failed",
						next_retry_at: nextRetryAt?.toISOString(),
						attempts: shouldRetry ? data.job.attempts + 1 : undefined,
						error_message: shouldRetry ? undefined : data.errorMessage,
						updated_at: new Date().toISOString(),
					},
					where: [
						{
							key: "job_id",
							operator: "=",
							value: data.job.job_id,
						},
					],
					returning: ["id"],
				});
				if (updateJobRes.error) return updateJobRes;

				logger[shouldRetry ? "debug" : "error"]({
					message: shouldRetry ? "Job will retry" : "Job failed permanently",
					scope: QUEUE_LOG_SCOPE,
					data: {
						jobId: data.job.job_id,
						eventType: data.job.event_type,
						...(shouldRetry
							? { nextRetryAt: nextRetryAt?.toISOString() }
							: { errorMessage: data.errorMessage }),
					},
				});

				return {
					error: undefined,
					data: undefined,
				};
			} catch (error) {
				logger.error({
					message: "Error handling job failure",
					scope: QUEUE_LOG_SCOPE,
					data: { error, jobId: data.job.job_id },
				});
				return {
					error: { message: "Error handling job failure" },
					data: undefined,
				};
			}
		},
		/**
		 * The log scope for the queue
		 */
		logScope: QUEUE_LOG_SCOPE,
	};
};

export default createQueueContext;
