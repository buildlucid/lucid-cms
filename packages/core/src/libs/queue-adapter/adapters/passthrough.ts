import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import logger from "../../logger/index.js";
import { QueueJobsRepository } from "../../repositories/index.js";
import type { QueueAdapterInstance } from "../types.js";
import executeSingleJob from "../execute-single-job.js";

const ADAPTER_KEY = "passthrough";

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
					scope: constants.logScopes.queueAdapter,
				});
			},
			destroy: async () => {
				logger.debug({
					message: "The passthrough queue has stopped",
					scope: constants.logScopes.queueAdapter,
				});
			},
		},
		command: {
			add: async (event, params) => {
				try {
					logger.info({
						message: "Adding job to the passthrough queue",
						scope: constants.logScopes.queueAdapter,
						data: { event },
					});

					const jobId = randomUUID();
					const now = new Date();
					const status = "pending";
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

					//* skip immediate execution
					if (options?.bypassImmediateExecution) {
						return {
							error: undefined,
							data: { jobId, event: event, status },
						};
					}

					//* execute the event handler immediately
					const executeResult = await executeSingleJob(params.serviceContext, {
						jobId: jobId,
						event: event,
						payload: params.payload,
						attempts: 0,
						maxAttempts: 1,
						setNextRetryAt: false,
					});
					if (
						executeResult.success === false &&
						executeResult.shouldRetry === false
					) {
						return {
							error: {
								message: executeResult.message,
							},
							data: undefined,
						};
					}

					return {
						error: undefined,
						data: { jobId, event: event, status },
					};
				} catch (error) {
					logger.error({
						message: "Error adding event to the queue",
						scope: constants.logScopes.queueAdapter,
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
						scope: constants.logScopes.queueAdapter,
						data: { event, count: params.payloads.length },
					});

					const now = new Date();
					const status = "pending";
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
						scope: constants.logScopes.queueAdapter,
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
								executeSingleJob(params.serviceContext, {
									jobId: job.jobId,
									event,
									payload: job.payload,
									attempts: 0,
									maxAttempts: 1,
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
							scope: constants.logScopes.queueAdapter,
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
						scope: constants.logScopes.queueAdapter,
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
						scope: constants.logScopes.queueAdapter,
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
