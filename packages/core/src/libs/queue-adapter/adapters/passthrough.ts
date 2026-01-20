import constants from "../../../constants/constants.js";
import logger from "../../logger/index.js";
import executeSingleJob from "../execute-single-job.js";
import { insertJobs } from "../insert-job.js";
import type { QueueAdapterInstance } from "../types.js";

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
		add: async (event, params) => {
			try {
				logger.info({
					message: "Adding job to the passthrough queue",
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

				//* skip immediate execution
				if (options?.bypassImmediateExecution) {
					return {
						error: undefined,
						data: {
							jobId: jobData.jobId,
							event,
							status: createJobRes.data.status,
						},
					};
				}

				//* execute the event handler immediately
				const executeResult = await executeSingleJob(params.serviceContext, {
					jobId: jobData.jobId,
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
					data: {
						jobId: jobData.jobId,
						event,
						status: createJobRes.data.status,
					},
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

				const createJobsRes = await insertJobs(params.serviceContext, {
					event,
					payloads: params.payloads,
					options: params.options,
					adapterKey: ADAPTER_KEY,
				});
				if (createJobsRes.error) return createJobsRes;

				//* skip immediate execution
				if (options?.bypassImmediateExecution) {
					return {
						error: undefined,
						data: {
							jobIds: createJobsRes.data.jobs.map((j) => j.jobId),
							event,
							status: createJobsRes.data.status,
							count: createJobsRes.data.jobs.length,
						},
					};
				}

				//* execute the event handlers immediately for all jobs in chunks
				const concurrentLimit = constants.queue.concurrentLimit;

				//* split jobs into chunks based on concurrent limit
				const jobChunks: Array<
					{ jobId: string; payload: Record<string, unknown> }[]
				> = [];
				for (
					let i = 0;
					i < createJobsRes.data.jobs.length;
					i += concurrentLimit
				) {
					const chunk = createJobsRes.data.jobs
						.slice(i, i + concurrentLimit)
						.map((job) => {
							return { jobId: job.jobId, payload: job.payload };
						});
					jobChunks.push(chunk);
				}

				logger.debug({
					message: "Processing batch jobs in chunks",
					scope: constants.logScopes.queueAdapter,
					data: {
						totalJobs: createJobsRes.data.jobs.length,
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
						firstError instanceof Error ? firstError.message : "Unknown error";

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
					data: { count: createJobsRes.data.jobs.length },
				});

				return {
					error: undefined,
					data: {
						jobIds: createJobsRes.data.jobs.map((j) => j.jobId),
						event,
						status: createJobsRes.data.status,
						count: createJobsRes.data.jobs.length,
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
	};
}

export default passthroughQueueAdapter;
