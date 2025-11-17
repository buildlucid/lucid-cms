import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import logger from "../../logger/index.js";
import Repository from "../../repositories/index.js";
import getJobHandler from "../job-handlers.js";
import type {
	QueueAdapter,
	QueueAdapterInstance,
	QueueEvent,
	QueueJobHandlerFn,
	QueueJobHandlers,
} from "../types.js";

const ADAPTER_KEY = "passthrough";

/**
 * Executes a single job immediately and updates its status in the database
 */
const executeJob = async (data: {
	jobId: string;
	event: QueueEvent;
	payload: Record<string, unknown>;
	serviceContext: ServiceContext;
	logScope: string;
}): ServiceResponse<undefined> => {
	const handler = getJobHandler(data.event);
	const QueueJobs = Repository.get(
		"queue-jobs",
		data.serviceContext.db,
		data.serviceContext.config.db,
	);

	if (!handler) {
		logger.warn({
			message: "No job handler found for job type",
			scope: data.logScope,
			data: { jobId: data.jobId, eventType: data.event },
		});

		await QueueJobs.updateSingle({
			data: {
				status: "failed",
				error_message: `No job handler found for job type: ${data.event}`,
				failed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "job_id", operator: "=", value: data.jobId }],
		});

		return {
			error: { message: `No job handler found for job type: ${data.event}` },
			data: undefined,
		};
	}

	try {
		logger.debug({
			message: "Processing job immediately",
			scope: data.logScope,
			data: { jobId: data.jobId, eventType: data.event },
		});

		//* update job to processing status
		await QueueJobs.updateSingle({
			data: {
				status: "processing",
				attempts: 1,
				started_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "job_id", operator: "=", value: data.jobId }],
		});

		//* execute the handler
		const handlerResult = await handler(data.serviceContext, data.payload);

		if (handlerResult.error) {
			//* update job to failed status
			await QueueJobs.updateSingle({
				data: {
					status: "failed",
					error_message: handlerResult.error.message ?? "Unknown error",
					failed_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				where: [{ key: "job_id", operator: "=", value: data.jobId }],
			});

			logger.error({
				message: "Job failed",
				scope: data.logScope,
				data: {
					jobId: data.jobId,
					eventType: data.event,
					errorMessage: handlerResult.error.message,
				},
			});

			return {
				error: handlerResult.error,
				data: undefined,
			};
		}

		//* update job to completed status
		await QueueJobs.updateSingle({
			data: {
				status: "completed",
				completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "job_id", operator: "=", value: data.jobId }],
		});

		logger.debug({
			message: "Job completed successfully",
			scope: data.logScope,
			data: { jobId: data.jobId, eventType: data.event },
		});

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		//* update job to failed status
		await QueueJobs.updateSingle({
			data: {
				status: "failed",
				error_message: errorMessage,
				failed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "job_id", operator: "=", value: data.jobId }],
		});

		logger.error({
			message: "Job failed with exception",
			scope: data.logScope,
			data: {
				jobId: data.jobId,
				eventType: data.event,
				errorMessage,
			},
		});

		return {
			error: { message: errorMessage },
			data: undefined,
		};
	}
};

type PassthroughQueueAdapterOptions = {
	bypassImmediateExecution?: boolean;
};

/**
 * A passthrough queue adapter that will only mock the queue, and execute the event handlers immediately
 */
function passthroughQueueAdapter(): QueueAdapterInstance;
function passthroughQueueAdapter(
	options: PassthroughQueueAdapterOptions,
): QueueAdapterInstance;
function passthroughQueueAdapter(
	options?: PassthroughQueueAdapterOptions,
): QueueAdapterInstance {
	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		lifecycle: {
			init: async () => {
				logger.debug({
					message: "The passthrough queue has started",
					scope: constants.logScopes.queue,
				});
			},
			destroy: async () => {
				logger.debug({
					message: "The passthrough queue has stopped",
					scope: constants.logScopes.queue,
				});
			},
		},
		command: {
			add: async (event, params) => {
				try {
					logger.info({
						message: "Adding job to the passthrough queue",
						scope: constants.logScopes.queue,
						data: { event },
					});

					const jobId = randomUUID();
					const now = new Date();
					const status = "pending";
					const QueueJobs = Repository.get(
						"queue-jobs",
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

					//* skip immediate execution
					if (options?.bypassImmediateExecution) {
						return {
							error: undefined,
							data: { jobId, event: event, status },
						};
					}

					//* execute the event handler immediately
					const executeResult = await executeJob({
						jobId: jobId,
						event: event,
						payload: params.payload,
						serviceContext: params.serviceContext,
						logScope: constants.logScopes.queue,
					});

					if (executeResult.error) {
						return executeResult;
					}

					return {
						error: undefined,
						data: { jobId, event: event, status },
					};
				} catch (error) {
					logger.error({
						message: "Error adding event to the queue",
						scope: constants.logScopes.queue,
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
			addBatch: async (event, params) => {
				try {
					logger.info({
						message: "Adding batch jobs to the passthrough queue",
						scope: constants.logScopes.queue,
						data: { event, count: params.payloads.length },
					});

					const now = new Date();
					const status = "pending";
					const QueueJobs = Repository.get(
						"queue-jobs",
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

					//* skip immediate execution
					if (options?.bypassImmediateExecution) {
						return {
							error: undefined,
							data: {
								jobIds: jobsData.map((j) => j.jobId),
								event: event,
								status: status,
								count: jobsData.length,
							},
						};
					}

					//* execute the event handlers immediately for all jobs in chunks
					const concurrentLimit = constants.queue.concurrentLimit;

					//* split jobs into chunks based on concurrent limit
					const jobChunks: Array<
						{ jobId: string; payload: Record<string, unknown> }[]
					> = [];
					for (let i = 0; i < jobsData.length; i += concurrentLimit) {
						const chunk = jobsData.slice(i, i + concurrentLimit).map((job) => {
							return { jobId: job.jobId, payload: job.payload };
						});
						jobChunks.push(chunk);
					}

					logger.debug({
						message: "Processing batch jobs in chunks",
						scope: constants.logScopes.queue,
						data: {
							totalJobs: jobsData.length,
							chunkCount: jobChunks.length,
							concurrentLimit,
						},
					});

					//* process each chunk sequentially
					const allResults = await Promise.allSettled(
						jobChunks.flatMap((chunk) =>
							chunk.map((job) =>
								executeJob({
									jobId: job.jobId,
									event,
									payload: job.payload,
									serviceContext: params.serviceContext,
									logScope: constants.logScopes.queue,
								}),
							),
						),
					);

					//* check if any jobs failed
					const failedJobs = allResults.filter((r) => r.status === "rejected");
					if (failedJobs.length > 0) {
						const firstError = failedJobs[0]?.reason;
						const errorMessage =
							firstError instanceof Error
								? firstError.message
								: "Unknown error";

						logger.error({
							message: "Some batch jobs failed",
							scope: constants.logScopes.queue,
							data: {
								failedCount: failedJobs.length,
								totalCount: allResults.length,
							},
						});

						return {
							error: {
								message: `${failedJobs.length} of ${allResults.length} jobs failed. First error: ${errorMessage}`,
							},
							data: undefined,
						};
					}

					logger.debug({
						message: "All batch jobs completed successfully",
						scope: constants.logScopes.queue,
						data: { count: jobsData.length },
					});

					return {
						error: undefined,
						data: {
							jobIds: jobsData.map((j) => j.jobId),
							event: event,
							status: status,
							count: jobsData.length,
						},
					};
				} catch (error) {
					logger.error({
						message: "Error adding batch events to the queue",
						scope: constants.logScopes.queue,
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
		},
	};
}

export default passthroughQueueAdapter;
