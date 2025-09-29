import type { Config } from "../../types.js";
import type {
	QueueEvent,
	QueueJobStatus,
	QueueJobResponse,
	QueueAdapterInstance,
} from "./types.js";
import { randomUUID } from "node:crypto";
import logger from "../logger/index.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import queueEventHandlers from "./event-handlers.js";
import services from "../../services/index.js";

export const QUEUE_LOG_SCOPE = "queue" as const;

const BACKOFF_MULTIPLIER = 2;

/**
 * Responsible for creating the context for the queue adapters.
 */
const createQueueContext = (config: Config) => {
	const eventHandlers = queueEventHandlers(config);

	return {
		/**
		 * Responsible for adding a job to the queue.
		 * - Inserts job into the database
		 * - If KV is enabled, then also inserts into the KV
		 * - Logs the job
		 * */
		insertJob: async (
			event: QueueEvent,
			payload: Record<string, unknown>,
			options: {
				status?: QueueJobStatus;
				priority?: number;
				maxAttempts?: number;
				scheduledFor?: Date;
				createdByUserId?: number;
				queueAdapterKey: string;
			},
		): ServiceResponse<QueueJobResponse> => {
			try {
				//* insert event into the database, if KV is enabled, then also insert into the KV
				const jobId = randomUUID();
				const now = new Date();

				const status = options?.status || "pending";

				await config.db.client
					.insertInto("lucid_queue_jobs")
					.values({
						job_id: jobId,
						event_type: event,
						event_data: config.db.formatInsertValue("json", payload ?? {}),
						status: status,
						queue_adapter_key: options.queueAdapterKey,
						priority: options?.priority ?? 0,
						attempts: 0,
						max_attempts:
							options?.maxAttempts ??
							config.queue.defaultJobOptions.maxAttempts,
						error_message: null,
						created_at: now.toISOString(),
						scheduled_for: options.scheduledFor
							? options.scheduledFor.toISOString()
							: null,
						created_by_user_id: options?.createdByUserId ?? null,
						updated_at: now.toISOString(),
					})
					.execute();

				// TODO: Insert into KV if configured
				// if (config.kv) {
				//   await config.kv.set(`job:${jobId}`, job);
				//   await config.kv.lpush('pending_jobs', jobId);
				// }

				return { error: undefined, data: { jobId, event, status: status } };
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
		 * Responsible for getting the event handlers
		 */
		getEventHandlers: () => {
			// TODO: merge with the config.queues.eventHandlers
			return eventHandlers;
		},
		/**
		 * Responsible for getting the ready jobs
		 */
		getReadyJobs: async () => {
			try {
				const now = new Date();

				// TODO: Add KV use here once its implemented

				const jobs = await config.db.client
					.selectFrom("lucid_queue_jobs")
					.selectAll()
					.where((eb) =>
						eb.or([
							eb("status", "=", "pending"),
							eb.and([
								eb("status", "=", "failed"),
								eb("attempts", "<", eb.ref("max_attempts")),
								eb("next_retry_at", "<=", now.toISOString()),
							]),
						]),
					)
					.orderBy(["priority desc", "created_at asc"])
					.limit(config.queue.processing.batchSize)
					.execute();

				return jobs;
			} catch (error) {
				logger.error({
					message: "Error getting jobs",
					scope: QUEUE_LOG_SCOPE,
					data: { error },
				});
				return [];
			}
		},
		/**
		 * Responsible for updating a job
		 */
		updateJob: async (
			jobId: string,
			updates: {
				status?: QueueJobStatus;
				attempts?: number;
				nextRetryAt?: Date | null;
				errorMessage?: string | null;
			},
		) => {
			const dbUpdates: Record<string, unknown> = {
				updated_at: new Date().toISOString(),
			};

			if (updates.status) {
				dbUpdates.status = updates.status;

				if (updates.status === "processing") {
					dbUpdates.started_at = new Date().toISOString();
				} else if (updates.status === "completed") {
					dbUpdates.completed_at = new Date().toISOString();
				} else if (updates.status === "failed") {
					dbUpdates.failed_at = new Date().toISOString();
				}
			}

			if (updates.attempts !== undefined) {
				dbUpdates.attempts = updates.attempts;
			}
			if (updates.nextRetryAt !== undefined) {
				dbUpdates.next_retry_at = updates.nextRetryAt?.toISOString() || null;
			}
			if (updates.errorMessage !== undefined) {
				dbUpdates.error_message = updates.errorMessage;
			}

			await config.db.client
				.updateTable("lucid_queue_jobs")
				.set(dbUpdates)
				.where("job_id", "=", jobId)
				.execute();
		},
		/**
		 * Responsible for handling a job failure
		 */
		handleJobFailure: async (
			job: {
				job_id: string;
				event_type: QueueEvent;
				attempts: number;
				max_attempts: number;
			},
			errorMessage: string,
		) => {
			const shouldRetry = job.attempts < job.max_attempts;

			if (shouldRetry) {
				const backoffSeconds = BACKOFF_MULTIPLIER ** job.attempts * 1000;
				const nextRetryAt = new Date(Date.now() + backoffSeconds);

				await config.db.client
					.updateTable("lucid_queue_jobs")
					.set({
						status: "pending",
						next_retry_at: nextRetryAt.toISOString(),
						attempts: job.attempts + 1,
						updated_at: new Date().toISOString(),
					})
					.where("job_id", "=", job.job_id)
					.execute();

				logger.debug({
					message: "Job will retry",
					scope: QUEUE_LOG_SCOPE,
					data: {
						jobId: job.job_id,
						eventType: job.event_type,
						nextRetryAt: nextRetryAt.toISOString(),
					},
				});
			} else {
				await config.db.client
					.updateTable("lucid_queue_jobs")
					.set({
						status: "failed",
						error_message: errorMessage,
						updated_at: new Date().toISOString(),
					})
					.where("job_id", "=", job.job_id)
					.execute();

				logger.error({
					message: "Job failed permanently",
					scope: QUEUE_LOG_SCOPE,
					data: {
						jobId: job.job_id,
						eventType: job.event_type,
						errorMessage,
					},
				});
			}
		},
		/**
		 * The log scope for the queue
		 */
		logScope: QUEUE_LOG_SCOPE,
	};
};

export default createQueueContext;
