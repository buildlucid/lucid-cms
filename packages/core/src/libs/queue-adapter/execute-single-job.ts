import constants from "../../constants/constants.js";
import logger from "../logger/index.js";
import { QueueJobsRepository } from "../repositories/index.js";
import getJobHandler from "./job-handlers.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { QueueEvent } from "./types.js";

const BACKOFF_MULTIPLIER = 2;

/**
 * Executes a single job and updates its status in the database.
 */
const executeSingleJob: ServiceFn<
	[
		{
			jobId: string;
			event: QueueEvent;
			payload: Record<string, unknown>;
			attempts: number;
			maxAttempts: number;
		},
	],
	{
		shouldRetry: boolean;
	}
> = async (serviceContext, data) => {
	const handler = getJobHandler(data.event);
	const QueueJobs = new QueueJobsRepository(
		serviceContext.db,
		serviceContext.config.db,
	);

	if (!handler) {
		logger.warn({
			message: "No job handler found for job type",
			scope: constants.logScopes.queue,
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
			error: {
				message: `No job handler found for job type: ${data.event}`,
			},
			data: undefined,
		};
	}

	try {
		logger.debug({
			message: "Processing job",
			scope: constants.logScopes.queue,
			data: { jobId: data.jobId, eventType: data.event },
		});

		await QueueJobs.updateSingle({
			data: {
				status: "processing",
				attempts: data.attempts + 1,
				started_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "job_id", operator: "=", value: data.jobId }],
		});

		const handlerResult = await handler(serviceContext, data.payload);

		if (handlerResult.error) {
			const shouldRetry = data.attempts + 1 < data.maxAttempts;

			if (shouldRetry) {
				const nextRetryAt = new Date(
					Date.now() + BACKOFF_MULTIPLIER ** data.attempts * 1000,
				);

				logger.debug({
					message: "Job failed, will retry",
					scope: constants.logScopes.queue,
					data: {
						jobId: data.jobId,
						eventType: data.event,
						attempts: data.attempts + 1,
						maxAttempts: data.maxAttempts,
						nextRetryAt: nextRetryAt.toISOString(),
					},
				});

				await QueueJobs.updateSingle({
					data: {
						status: "pending",
						next_retry_at: nextRetryAt.toISOString(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "job_id", operator: "=", value: data.jobId }],
				});
			} else {
				logger.error({
					message: "Job failed permanently",
					scope: constants.logScopes.queue,
					data: {
						jobId: data.jobId,
						eventType: data.event,
						errorMessage: handlerResult.error.message,
					},
				});

				await QueueJobs.updateSingle({
					data: {
						status: "failed",
						error_message: handlerResult.error.message ?? "Unknown error",
						failed_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
					where: [{ key: "job_id", operator: "=", value: data.jobId }],
				});
			}

			return {
				error: {
					message: handlerResult.error.message ?? "Unknown error",
				},
				data: undefined,
			};
		}

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
			scope: constants.logScopes.queue,
			data: { jobId: data.jobId, eventType: data.event },
		});

		return {
			error: undefined,
			data: {
				shouldRetry: false,
			},
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const shouldRetry = data.attempts + 1 < data.maxAttempts;

		if (shouldRetry) {
			logger.debug({
				message: "Job failed with exception, will retry",
				scope: constants.logScopes.queue,
				data: {
					jobId: data.jobId,
					eventType: data.event,
					errorMessage,
					attempts: data.attempts + 1,
					maxAttempts: data.maxAttempts,
				},
			});

			await QueueJobs.updateSingle({
				data: {
					status: "pending",
					updated_at: new Date().toISOString(),
				},
				where: [{ key: "job_id", operator: "=", value: data.jobId }],
			});
		} else {
			logger.error({
				message: "Job failed permanently with exception",
				scope: constants.logScopes.queue,
				data: {
					jobId: data.jobId,
					eventType: data.event,
					errorMessage,
				},
			});

			await QueueJobs.updateSingle({
				data: {
					status: "failed",
					error_message: errorMessage,
					failed_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
				where: [{ key: "job_id", operator: "=", value: data.jobId }],
			});
		}

		return {
			error: {
				message: errorMessage,
			},
			data: undefined,
		};
	}
};

export default executeSingleJob;
