import constants from "../../constants/constants.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { text } from "../i18n/index.js";
import logger from "../logger/index.js";
import { QueueJobsRepository } from "../repositories/index.js";
import getJobHandler from "./job-handlers.js";
import type { QueueEvent, QueueJobHandler } from "./types.js";

const BACKOFF_MULTIPLIER = 2;

const getHandlerFn = (handler: QueueJobHandler) => {
	if (typeof handler === "function") return handler;
	return handler.handler;
};

const runPermanentFailureHook = async (params: {
	handler: QueueJobHandler;
	context: ServiceContext;
	jobId: string;
	event: QueueEvent;
	payload: Record<string, unknown>;
	errorMessage: string;
}) => {
	if (typeof params.handler === "function") return;
	if (!params.handler.onPermanentFailure) return;

	await params.handler.onPermanentFailure(params.context, {
		jobId: params.jobId,
		event: params.event,
		payload: params.payload,
		errorMessage: params.errorMessage,
	});
};

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
	const QueueJobs = new QueueJobsRepository(
		context.db.client,
		context.config.db,
	);
	const setNextRetryAt = data.setNextRetryAt ?? true;

	const jobRes = await QueueJobs.selectSingle({
		select: ["status"],
		where: [{ key: "job_id", operator: "=", value: data.jobId }],
		validation: {
			enabled: true,
			defaultError: {
				message: text.server("core.queue.jobs.not.found", {
					defaultMessage: `Queue job not found: ${data.jobId}`,
				}),
				status: 404,
			},
		},
	});
	if (jobRes.error) {
		return {
			success: false,
			shouldRetry: false,
			message:
				context.translate.english.text(jobRes.error.message) ??
				"Queue job not found",
		};
	}

	if (jobRes.data.status !== "pending") {
		logger.debug({
			message: "Skipping non-pending queue job",
			scope: constants.logScopes.queueAdapter,
			data: {
				jobId: data.jobId,
				eventType: data.event,
				status: jobRes.data.status,
			},
		});

		return {
			success: true,
			shouldRetry: false,
			message: "Queue job is no longer pending",
		};
	}

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

		const handlerResult = await serviceWrapper(getHandlerFn(handler), {
			transaction: false, //* jobs should handle cleanup themselves
		})(context, data.payload);

		if (handlerResult.error) {
			const errorMessage =
				context.translate.english.text(handlerResult.error.message) ??
				"Unknown error";
			const shouldRetry = await handleRetryLogic({
				jobId: data.jobId,
				event: data.event,
				errorMessage,
				attempts: data.attempts,
				maxAttempts: data.maxAttempts,
				setNextRetryAt,
				QueueJobs,
			});
			if (!shouldRetry) {
				await runPermanentFailureHook({
					handler,
					context,
					event: data.event,
					jobId: data.jobId,
					payload: data.payload,
					errorMessage,
				});
			}

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
		if (!shouldRetry) {
			await runPermanentFailureHook({
				handler,
				context,
				event: data.event,
				jobId: data.jobId,
				payload: data.payload,
				errorMessage,
			});
		}

		return {
			success: false,
			shouldRetry,
			message: errorMessage,
		};
	}
};

export default executeSingleJob;
