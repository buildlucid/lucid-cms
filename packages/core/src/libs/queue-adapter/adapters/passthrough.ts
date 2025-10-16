import constants from "../../../constants/constants.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import logger from "../../logger/index.js";
import Repository from "../../repositories/index.js";
import type {
	QueueAdapterFactory,
	QueueEvent,
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
	handlers: QueueJobHandlers;
	logScope: string;
}): ServiceResponse<undefined> => {
	const handler = data.handlers[data.event];
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
export function passthroughQueueAdapter(): QueueAdapterFactory<PassthroughQueueAdapterOptions>;
export function passthroughQueueAdapter(
	options: PassthroughQueueAdapterOptions,
): QueueAdapterFactory<PassthroughQueueAdapterOptions>;
export function passthroughQueueAdapter(
	options: PassthroughQueueAdapterOptions = {},
): QueueAdapterFactory<PassthroughQueueAdapterOptions> {
	return (context) => ({
		type: "queue-adapter",
		key: ADAPTER_KEY,
		lifecycle: {
			init: async () => {
				logger.debug({
					message: "The passthrough queue has started",
					scope: context.logScope,
				});
			},
			destroy: async () => {
				logger.debug({
					message: "The passthrough queue has stopped",
					scope: context.logScope,
				});
			},
		},
		command: {
			add: async (event, params) => {
				logger.info({
					message: "Adding job to the passthrough queue",
					scope: context.logScope,
					data: { event },
				});

				const jobResponse = await context.insertJob(params.serviceContext, {
					event: event,
					payload: params.payload,
					queueAdapterKey: ADAPTER_KEY,
					options: params.options,
				});
				if (jobResponse.error) return jobResponse;

				//* skip immediate execution
				if (options?.bypassImmediateExecution) {
					return jobResponse;
				}

				//* execute the event handler immediately
				const executeResult = await executeJob({
					jobId: jobResponse.data.jobId,
					event: event,
					payload: params.payload,
					serviceContext: params.serviceContext,
					handlers: context.getJobHandlers,
					logScope: context.logScope,
				});

				if (executeResult.error) {
					return executeResult;
				}

				return jobResponse;
			},
			addBatch: async (event, params) => {
				logger.info({
					message: "Adding batch jobs to the passthrough queue",
					scope: context.logScope,
					data: { event, count: params.payloads.length },
				});

				const jobResponse = await context.insertMultipleJobs(
					params.serviceContext,
					{
						event: event,
						payloads: params.payloads,
						queueAdapterKey: ADAPTER_KEY,
						options: params.options,
					},
				);
				if (jobResponse.error) return jobResponse;

				//* skip immediate execution
				if (options?.bypassImmediateExecution) {
					return jobResponse;
				}

				//* execute the event handlers immediately for all jobs in chunks
				const concurrentLimit = constants.queue.concurrentLimit;

				//* split jobs into chunks based on concurrent limit
				const jobChunks: Array<
					{ jobId: string; payload: Record<string, unknown> }[]
				> = [];
				for (
					let i = 0;
					i < jobResponse.data.jobIds.length;
					i += concurrentLimit
				) {
					const chunk = jobResponse.data.jobIds
						.slice(i, i + concurrentLimit)
						.map((jobId, localIndex) => {
							const payload = params.payloads[i + localIndex];
							if (!payload) {
								throw new Error("Payload not found for job");
							}
							return { jobId, payload };
						});
					jobChunks.push(chunk);
				}

				logger.debug({
					message: "Processing batch jobs in chunks",
					scope: context.logScope,
					data: {
						totalJobs: jobResponse.data.jobIds.length,
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
								handlers: context.getJobHandlers,
								logScope: context.logScope,
							}),
						),
					),
				);

				//* check if any jobs failed
				const failedJobs = allResults.filter((r) => r.status === "rejected");
				if (failedJobs.length > 0) {
					const firstError = failedJobs[0]?.reason;
					const errorMessage =
						firstError instanceof Error ? firstError.message : "Unknown error";

					logger.error({
						message: "Some batch jobs failed",
						scope: context.logScope,
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
					scope: context.logScope,
					data: { count: jobResponse.data.count },
				});

				return jobResponse;
			},
		},
	});
}

export default passthroughQueueAdapter;
