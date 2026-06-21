import { logger } from "@lucidcms/core";
import { copy } from "@lucidcms/core/plugin";
import { executeSingleJob, insertJobs, logScope } from "@lucidcms/core/queue";
import type { QueueAdapterInstance } from "@lucidcms/core/types";
import { ADAPTER_KEY, CONCURRENT_LIMIT } from "./constants.js";
import { getDelaySeconds } from "./helper.js";
import type { PluginOptions } from "./types.js";
import { resolveBinding } from "./utils/resolve-binding.js";

const cloudflareQueuesAdapter = (
	options: PluginOptions,
): QueueAdapterInstance => {
	let consumerSupported = false;

	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		support: {
			get scheduling() {
				return consumerSupported;
			},
		},
		lifecycle: {
			init: async (params) => {
				consumerSupported = params.runtimeContext?.compiled ?? false;

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
		add: async (context, params) => {
			try {
				const { event } = params;
				if (params.options?.scheduledFor && !consumerSupported) {
					return {
						error: {
							message: copy(
								"server:plugin.cloudflare.queues.scheduling.production.only",
							),
						},
						data: undefined,
					};
				}

				logger.info({
					message: "Adding job to Cloudflare queue",
					scope: logScope,
					data: { event },
				});

				const createJobRes = await insertJobs(context, {
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
							message: copy(
								"server:plugin.cloudflare.queues.jobs.create.failed",
								{
									defaultMessage: "Failed to create job",
								},
							),
						},
						data: undefined,
					};
				}

				if (consumerSupported) {
					const binding = resolveBinding(context, options);
					await binding.send(
						{
							jobId: jobData.jobId,
							event,
							payload: params.payload,
						},
						params.options?.scheduledFor
							? {
									delaySeconds: getDelaySeconds(params.options.scheduledFor),
								}
							: undefined,
					);
				} else {
					const executeResult = await executeSingleJob(context, {
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
								message: copy(
									"server:plugin.cloudflare.queues.jobs.execute.failed",
									{
										defaultMessage: executeResult.message,
									},
								),
							},
							data: undefined,
						};
					}
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
					error: {
						message: copy("server:plugin.cloudflare.queues.jobs.add.failed", {
							defaultMessage: "Error adding job to Cloudflare queue",
						}),
					},
					data: undefined,
				};
			}
		},
		addBatch: async (context, params) => {
			try {
				const { event } = params;
				if (params.options?.scheduledFor && !consumerSupported) {
					return {
						error: {
							message: copy(
								"server:plugin.cloudflare.queues.scheduling.production.only",
							),
						},
						data: undefined,
					};
				}

				logger.info({
					message: "Adding batch jobs to Cloudflare queue",
					scope: logScope,
					data: { event, count: params.payloads.length },
				});

				const createJobsRes = await insertJobs(context, {
					event,
					payloads: params.payloads,
					options: params.options,
					adapterKey: ADAPTER_KEY,
				});
				if (createJobsRes.error) return createJobsRes;

				if (consumerSupported) {
					const binding = resolveBinding(context, options);
					await binding.sendBatch(
						createJobsRes.data.jobs.map((job) => ({
							body: {
								jobId: job.jobId,
								event,
								payload: job.payload,
							},
							...(params.options?.scheduledFor
								? {
										delaySeconds: getDelaySeconds(params.options.scheduledFor),
									}
								: {}),
						})),
					);
				} else {
					const jobChunks: Array<
						{ jobId: string; payload: Record<string, unknown> }[]
					> = [];
					for (
						let i = 0;
						i < createJobsRes.data.jobs.length;
						i += CONCURRENT_LIMIT
					) {
						const chunk = createJobsRes.data.jobs
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
							totalJobs: createJobsRes.data.jobs.length,
							chunkCount: jobChunks.length,
							concurrentLimit: CONCURRENT_LIMIT,
						},
					});

					const allResults = await Promise.allSettled(
						jobChunks.flatMap((chunk) =>
							chunk.map((job) =>
								executeSingleJob(context, {
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

					const failedJobs = allResults.filter((r) => r.status === "rejected");
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
								message: copy(
									"server:plugin.cloudflare.queues.jobs.batch.execute.failed",
									{
										defaultMessage: `${failedJobs.length} of ${allResults.length} jobs failed. First error: ${errorMessage}`,
									},
								),
							},
							data: undefined,
						};
					}

					logger.debug({
						message: "All batch jobs completed successfully",
						scope: logScope,
						data: { count: createJobsRes.data.jobs.length },
					});
				}

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
					error: {
						message: copy(
							"server:plugin.cloudflare.queues.jobs.add.batch.failed",
							{
								defaultMessage: "Error adding batch jobs to Cloudflare queue",
							},
						),
					},
					data: undefined,
				};
			}
		},
	};
};

export default cloudflareQueuesAdapter;
