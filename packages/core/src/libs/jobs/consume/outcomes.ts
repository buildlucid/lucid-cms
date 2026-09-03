import type { ServiceContext } from "../../../utils/services/types.js";
import { copy, isTranslatableCopy } from "../../i18n/index.js";
import { JobsRepository } from "../../repositories/index.js";
import { dispatchPendingJobs } from "../dispatch.js";
import { runPermanentFailureHook } from "../permanent-failure.js";
import { getRegisteredJob } from "../registry.js";
import type { JobConsumptionResult } from "../types.js";
import type { ClaimedJob } from "./lease.js";

/** Converts an unknown handler error into an English message for storage. */
export const toErrorMessage = (context: ServiceContext, error: unknown) => {
	if (typeof error === "string") return error;
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error !== null && "message" in error) {
		if (typeof error.message === "string") return error.message;
		if (isTranslatableCopy(error.message)) {
			return context.translate.english(error.message);
		}
	}
	return context.translate.english(copy("server:core.jobs.execution.failed"));
};

/**
 * Finishes a cancellation requested while this consumer held the lease. The
 * job is already resolved, so the delivery is always acknowledged.
 */
const finishCancellation = async (
	context: ServiceContext,
	job: ClaimedJob,
): Promise<JobConsumptionResult> => {
	const Jobs = new JobsRepository(context.db);

	await Jobs.cancelClaimed({
		jobId: job.job_id,
		leaseToken: job.lease_token,
		now: new Date().toISOString(),
	});

	return { type: "ignored" };
};

/** Marks a job completed while this consumer still owns its lease. */
export const completeJob = async (
	context: ServiceContext,
	job: ClaimedJob,
): Promise<JobConsumptionResult> => {
	const Jobs = new JobsRepository(context.db);

	const completed = await Jobs.completeClaimed({
		jobId: job.job_id,
		leaseToken: job.lease_token,
		now: new Date().toISOString(),
	});
	if (completed.error) return { type: "retry-transport" };
	if (!completed.data) return finishCancellation(context, job);

	return { type: "completed" };
};

/** Calculates capped exponential backoff for the next attempt. */
const retryDelay = (
	job: ClaimedJob,
	policy: { baseDelayMs: number; maxDelayMs: number; jitter: "none" | "full" },
) => {
	const capped = Math.min(
		policy.baseDelayMs * 2 ** Math.max(0, job.attempts - 1),
		policy.maxDelayMs,
	);

	return policy.jitter === "full" ? Math.floor(Math.random() * capped) : capped;
};

/** Returns a failed attempt to the queue at its next available time. */
const scheduleRetry = async (
	context: ServiceContext,
	job: ClaimedJob,
	props: { message: string; delayMs: number; immediateRetry: boolean },
): Promise<JobConsumptionResult> => {
	const now = new Date();
	const availableAt = new Date(now.getTime() + props.delayMs).toISOString();
	const Jobs = new JobsRepository(context.db);

	const retried = await Jobs.retryClaimed({
		availableAt,
		jobId: job.job_id,
		leaseToken: job.lease_token,
		message: props.message,
		now: now.toISOString(),
	});
	if (retried.error) return { type: "retry-transport" };
	if (!retried.data) return finishCancellation(context, job);

	//* An immediate retry is handled by the caller, not the queue adapter
	if (!props.immediateRetry) {
		await dispatchPendingJobs(context, { jobIds: [job.job_id] });
	}

	return { type: "retry-scheduled", availableAt };
};

/** Marks a job permanently failed and runs its permanent failure hook. */
const failJob = async (
	context: ServiceContext,
	job: ClaimedJob,
	message: string,
): Promise<JobConsumptionResult> => {
	const Jobs = new JobsRepository(context.db);

	const failed = await Jobs.failClaimed({
		jobId: job.job_id,
		leaseToken: job.lease_token,
		message,
		now: new Date().toISOString(),
	});
	if (failed.error) return { type: "retry-transport" };
	if (!failed.data) return finishCancellation(context, job);

	await runPermanentFailureHook(context, { job, errorMessage: message });

	return { type: "failed" };
};

/** Retries a failed attempt when its policy allows, otherwise fails the job. */
export const handleFailure = async (
	context: ServiceContext,
	job: ClaimedJob,
	props: { message: string; permanent: boolean; immediateRetry: boolean },
): Promise<JobConsumptionResult> => {
	const definition = getRegisteredJob(context.config, {
		name: job.job_name,
		version: job.job_version,
	});
	const policy = definition?.retry;

	const canRetry =
		!props.permanent &&
		policy?.type === "exponential" &&
		job.attempts < job.max_attempts;
	if (!canRetry) return failJob(context, job, props.message);

	return scheduleRetry(context, job, {
		message: props.message,
		delayMs: props.immediateRetry ? 0 : retryDelay(job, policy),
		immediateRetry: props.immediateRetry,
	});
};
