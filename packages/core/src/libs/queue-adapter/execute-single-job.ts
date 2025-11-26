import constants from "../../constants/constants.js";
import logger from "../logger/index.js";
import { QueueJobsRepository } from "../repositories/index.js";
import getJobHandler from "./job-handlers.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import type { QueueEvent } from "./types.js";
import { serviceWrapper } from "../../api.js";

const BACKOFF_MULTIPLIER = 2;

/**
 * Handles the retry logic for a failed job
 */
const handleRetryLogic = async (params: {
	jobId: string;
	event: QueueEvent;
	errorMessage: string;
	attempts: number;
	maxAttempts: number;
	setNextRetryAt: boolean;
	QueueJobs: QueueJobsRepository;
}): Promise<boolean> => {
	const shouldRetry = params.attempts + 1 < params.maxAttempts;

	if (shouldRetry) {
		const updateData: {
			status: "pending";
			updated_at: string;
			next_retry_at?: string;
		} = {
			status: "pending",
			updated_at: new Date().toISOString(),
		};

		if (params.setNextRetryAt) {
			const nextRetryAt = new Date(
				Date.now() + BACKOFF_MULTIPLIER ** params.attempts * 1000,
			);
			updateData.next_retry_at = nextRetryAt.toISOString();

			logger.debug({
				message: "Job failed, will retry",
				scope: constants.logScopes.queueAdapter,
				data: {
					jobId: params.jobId,
					eventType: params.event,
					attempts: params.attempts + 1,
					maxAttempts: params.maxAttempts,
					nextRetryAt: nextRetryAt.toISOString(),
				},
			});
		} else {
			logger.debug({
				message: "Job failed, will retry",
				scope: constants.logScopes.queueAdapter,
				data: {
					jobId: params.jobId,
					eventType: params.event,
					attempts: params.attempts + 1,
					maxAttempts: params.maxAttempts,
				},
			});
		}

		await params.QueueJobs.updateSingle({
			data: updateData,
			where: [{ key: "job_id", operator: "=", value: params.jobId }],
		});
	} else {
		logger.error({
			message: "Job failed permanently",
			scope: constants.logScopes.queueAdapter,
			data: {
				jobId: params.jobId,
				eventType: params.event,
				errorMessage: params.errorMessage,
			},
		});

		await params.QueueJobs.updateSingle({
			data: {
				status: "failed",
				error_message: params.errorMessage,
				failed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "job_id", operator: "=", value: params.jobId }],
		});
	}

	return shouldRetry;
};

/**
 * Executes a single job and updates its status in the database.
 */
const executeSingleJob: (
	context: ServiceContext,
	data: {
		jobId: string;
		event: QueueEvent;
		payload: Record<string, unknown>;
		attempts: number;
		maxAttempts: number;
		setNextRetryAt?: boolean;
	},
) => Promise<{
	success: boolean;
	shouldRetry: boolean;
	message: string;
}> = async (context, data) => {
	const handler = getJobHandler(data.event);
	const QueueJobs = new QueueJobsRepository(context.db, context.config.db);
	const setNextRetryAt = data.setNextRetryAt ?? true;

	if (!handler) {
		const errorMessage = `No job handler found for job type: ${data.event}`;

		logger.warn({
			message: "No job handler found for job type",
			scope: constants.logScopes.queueAdapter,
			data: { jobId: data.jobId, eventType: data.event },
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

		return {
			success: false,
			shouldRetry: false,
			message: errorMessage,
		};
	}

	try {
		logger.debug({
			message: "Processing job",
			scope: constants.logScopes.queueAdapter,
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

		const handlerResult = await serviceWrapper(handler, {
			transaction: false, //* jobs should handle cleanup themselves
		})(context, data.payload);

		if (handlerResult.error) {
			const errorMessage = handlerResult.error.message ?? "Unknown error";
			const shouldRetry = await handleRetryLogic({
				jobId: data.jobId,
				event: data.event,
				errorMessage,
				attempts: data.attempts,
				maxAttempts: data.maxAttempts,
				setNextRetryAt,
				QueueJobs,
			});

			return {
				success: false,
				shouldRetry,
				message: errorMessage,
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
			scope: constants.logScopes.queueAdapter,
			data: { jobId: data.jobId, eventType: data.event },
		});

		return {
			success: true,
			shouldRetry: false,
			message: "Job completed successfully",
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		const shouldRetry = await handleRetryLogic({
			jobId: data.jobId,
			event: data.event,
			errorMessage,
			attempts: data.attempts,
			maxAttempts: data.maxAttempts,
			setNextRetryAt,
			QueueJobs,
		});

		return {
			success: false,
			shouldRetry,
			message: errorMessage,
		};
	}
};

export default executeSingleJob;
