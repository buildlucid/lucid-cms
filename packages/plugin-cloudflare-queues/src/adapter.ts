import { randomUUID } from "node:crypto";
import { logger, QueueJobsRepository } from "@lucidcms/core";
import { executeSingleJob, logScope } from "@lucidcms/core/queue-adapter";
import type { QueueAdapterInstance } from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";
import { ADAPTER_KEY, CONCURRENT_LIMIT } from "./constants.js";

const cloudflareQueuesAdapter = (
	options: PluginOptions,
): QueueAdapterInstance => {
	let consumerSupported = false;

	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		lifecycle: {
			init: async (params) => {
				consumerSupported = params.runtimeContext.compiled;

				logger.debug({
					message: `Cloudflare queue adapter initialised in ${consumerSupported ? "production" : "development"} mode`,
					scope: logScope,
				});
			},
			destroy: async () => {
				logger.debug({
					message: "Cloudflare queue adapter destroyed",
					scope: logScope,
				});
			},
		},
		command: {
			add: async (event, params) => {
				try {
					logger.info({
						message: "Adding job to Cloudflare queue",
						scope: logScope,
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

					if (consumerSupported) {
						await options.binding.send({
							jobId,
							event,
							payload: params.payload,
						});
					} else {
						const executeResult = await executeSingleJob(
							params.serviceContext,
							{
								jobId: jobId,
								event: event,
								payload: params.payload,
								attempts: 0,
								maxAttempts: 1,
								setNextRetryAt: false,
							},
						);

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
					}

					return {
						error: undefined,
						data: { jobId, event, status },
					};
				} catch (error) {
					logger.error({
						message: "Error adding job to Cloudflare queue",
						scope: logScope,
						data: {
							errorMessage:
								error instanceof Error ? error.message : String(error),
							errorStack: error instanceof Error ? error.stack : undefined,
							error,
						},
					});

					return {
						error: { message: "Error adding job to Cloudflare queue" },
						data: undefined,
					};
				}
			},
			addBatch: async (event, params) => {
				try {
					logger.info({
						message: "Adding batch jobs to Cloudflare queue",
						scope: logScope,
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

					if (consumerSupported) {
						await options.binding.sendBatch(
							jobsData.map((job) => ({
								body: {
									jobId: job.jobId,
									event,
									payload: job.payload,
								},
							})),
						);
					} else {
						const jobChunks: Array<
							{ jobId: string; payload: Record<string, unknown> }[]
						> = [];
						for (let i = 0; i < jobsData.length; i += CONCURRENT_LIMIT) {
							const chunk = jobsData
								.slice(i, i + CONCURRENT_LIMIT)
								.map((job) => {
									return { jobId: job.jobId, payload: job.payload };
								});
							jobChunks.push(chunk);
						}

						logger.debug({
							message: "Processing batch jobs in chunks",
							scope: logScope,
							data: {
								totalJobs: jobsData.length,
								chunkCount: jobChunks.length,
								concurrentLimit: CONCURRENT_LIMIT,
							},
						});

						const allResults = await Promise.allSettled(
							jobChunks.flatMap((chunk) =>
								chunk.map((job) =>
									executeSingleJob(params.serviceContext, {
										jobId: job.jobId,
										event,
										payload: job.payload,
										attempts: 0,
										maxAttempts: 1,
										setNextRetryAt: false,
									}),
								),
							),
						);

						const failedJobs = allResults.filter(
							(r) => r.status === "rejected",
						);
						if (failedJobs.length > 0) {
							const firstError = failedJobs[0]?.reason;
							const errorMessage =
								firstError instanceof Error
									? firstError.message
									: "Unknown error";

							logger.error({
								message: "Some batch jobs failed",
								scope: logScope,
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
							scope: logScope,
							data: { count: jobsData.length },
						});
					}

					return {
						error: undefined,
						data: {
							jobIds: jobsData.map((j) => j.jobId),
							event,
							status,
							count: jobsData.length,
						},
					};
				} catch (error) {
					logger.error({
						message: "Error adding batch jobs to Cloudflare queue",
						scope: logScope,
						data: {
							errorMessage:
								error instanceof Error ? error.message : String(error),
							errorStack: error instanceof Error ? error.stack : undefined,
							error,
						},
					});

					return {
						error: { message: "Error adding batch jobs to Cloudflare queue" },
						data: undefined,
					};
				}
			},
		},
	};
};

export default cloudflareQueuesAdapter;
