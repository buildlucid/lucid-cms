import type { Config } from "../../types.js";
import type { QueueEvent, QueueJobStatus, QueueJobResponse } from "./types.js";
import { randomUUID } from "node:crypto";
import logger from "../logger/index.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import queueEventHandlers from "./event-handlers.js";

export const QUEUE_LOG_SCOPE = "queue" as const;
// TODO: make this configurable
const MAX_ATTEMPTS = 3;

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
		insertJobToDB: async (
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
						max_attempts: options?.maxAttempts ?? MAX_ATTEMPTS,
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
		 * The log scope for the queue
		 */
		logScope: QUEUE_LOG_SCOPE,
	};
};

export default createQueueContext;
