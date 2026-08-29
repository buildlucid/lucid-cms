import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import z from "zod";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { copy, isTranslatableCopy } from "../../i18n/index.js";
import logger from "../../logger/index.js";
import { getJobDefinitionKey, getJobRegistry } from "../registry.js";
import { jobPayloadSchema, jobStatusSchema } from "../schema.js";
import {
	getJobDefinitionRuntime,
	type JobConsumptionResult,
} from "../types.js";
import { dispatchPendingJobs } from "./dispatch-pending-jobs.js";

const LEASE_DURATION_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 20_000;

const claimedJobSchema = z.object({
	job_id: z.string(),
	job_name: z.string(),
	job_version: z.number(),
	payload: jobPayloadSchema,
	attempts: z.number(),
	max_attempts: z.number(),
	lease_token: z.string(),
});

const unclaimedJobSchema = z.object({
	status: jobStatusSchema,
	available_at: z.union([z.string(), z.date()]),
	lease_expires_at: z.union([z.string(), z.date()]).nullable(),
});

type ClaimedJob = z.infer<typeof claimedJobSchema>;

/** Converts an unknown handler error into an English message for storage. */
const errorMessage = (context: ServiceContext, error: unknown) => {
	if (typeof error === "string") return error;
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error !== null && "message" in error) {
		if (typeof error.message === "string") return error.message;
		if (isTranslatableCopy(error.message)) {
			return context.translate.english(error.message);
		}
	}
	return context.translate.english(
		copy("server:core.queue.jobs.execution.failed"),
	);
};

/** Atomically claims a ready job and gives this consumer a lease. */
const claimJob = async (
	context: ServiceContext,
	props: { jobId: string; now: Date },
) => {
	const now = props.now.toISOString();
	const leaseToken = randomUUID();
	const leaseExpiresAt = new Date(
		props.now.getTime() + LEASE_DURATION_MS,
	).toISOString();

	return context.db
		.query("queue.jobs.claim", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({
					status: "running",
					attempts: sql<number>`attempts + 1`,
					lease_token: leaseToken,
					lease_expires_at: leaseExpiresAt,
					heartbeat_at: now,
					started_at: now,
					dispatch_status: "dispatched",
					dispatched_at: now,
					next_dispatch_at: null,
					dispatch_error: null,
					updated_at: now,
				})
				.where("job_id", "=", props.jobId)
				.where("cancel_requested_at", "is", null)
				.whereRef("attempts", "<", "max_attempts")
				.where((eb) =>
					eb.or([
						eb.and([
							eb("status", "=", "queued"),
							eb("available_at", "<=", now),
						]),
						eb.and([
							eb("status", "=", "running"),
							eb("lease_expires_at", "<=", now),
						]),
					]),
				)
				.returning([
					"job_id",
					"job_name",
					"job_version",
					"payload",
					"attempts",
					"max_attempts",
					"lease_token",
				]),
		)
		.first({ schema: claimedJobSchema });
};

/** Decides whether an unclaimed delivery should be ignored or retried later. */
const resolveUnclaimedJob = async (
	context: ServiceContext,
	jobId: string,
): Promise<JobConsumptionResult> => {
	const existing = await context.db
		.query("queue.jobs.consume.unclaimed", (db) =>
			db
				.selectFrom("lucid_queue_jobs")
				.select(["status", "available_at", "lease_expires_at"])
				.where("job_id", "=", jobId),
		)
		.first({ schema: unclaimedJobSchema });
	if (existing.error) return { type: "retry-transport" };
	if (
		!existing.data ||
		["completed", "failed", "cancelled"].includes(existing.data.status)
	) {
		return { type: "ignored" };
	}

	const retryAt =
		existing.data.status === "queued"
			? existing.data.available_at
			: existing.data.lease_expires_at;
	const delayMs = retryAt
		? Math.max(1_000, new Date(retryAt).getTime() - Date.now())
		: 1_000;
	return { type: "retry-transport", delayMs };
};

/** Finishes a cancellation while this consumer still owns the job lease. */
const finishCancellation = async (context: ServiceContext, job: ClaimedJob) => {
	const now = new Date().toISOString();
	return context.db
		.query("queue.jobs.cancel.running", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({
					status: "cancelled",
					cancelled_at: now,
					lease_token: null,
					lease_expires_at: null,
					heartbeat_at: null,
					updated_at: now,
				})
				.where("job_id", "=", job.job_id)
				.where("lease_token", "=", job.lease_token)
				.where("status", "=", "running")
				.where("cancel_requested_at", "is not", null)
				.returning("job_id"),
		)
		.first();
};

/** Renews a job lease and aborts its handler if ownership is lost. */
const startHeartbeat = (
	context: ServiceContext,
	job: ClaimedJob,
	abortController: AbortController,
) => {
	let stopped = false;
	let timeout: ReturnType<typeof setTimeout> | undefined;

	/** Extends the lease once, then schedules the next heartbeat. */
	const heartbeat = async () => {
		if (stopped) return;

		const now = new Date();
		const result = await context.db
			.query("queue.jobs.heartbeat", (db) =>
				db
					.updateTable("lucid_queue_jobs")
					.set({
						heartbeat_at: now.toISOString(),
						lease_expires_at: new Date(
							now.getTime() + LEASE_DURATION_MS,
						).toISOString(),
						updated_at: now.toISOString(),
					})
					.where("job_id", "=", job.job_id)
					.where("lease_token", "=", job.lease_token)
					.where("status", "=", "running")
					.where("cancel_requested_at", "is", null)
					.returning("job_id"),
			)
			.first();

		if (result.error || !result.data) {
			abortController.abort();
			return;
		}
		timeout = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
	};

	timeout = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
	return () => {
		stopped = true;
		if (timeout) clearTimeout(timeout);
	};
};

/** Marks a job completed while this consumer still owns its lease. */
const completeJob = async (context: ServiceContext, job: ClaimedJob) => {
	const now = new Date().toISOString();
	return context.db
		.query("queue.jobs.complete", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({
					status: "completed",
					completed_at: now,
					error_message: null,
					lease_token: null,
					lease_expires_at: null,
					heartbeat_at: null,
					updated_at: now,
				})
				.where("job_id", "=", job.job_id)
				.where("lease_token", "=", job.lease_token)
				.where("status", "=", "running")
				.where("cancel_requested_at", "is", null)
				.returning("job_id"),
		)
		.first();
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
	props: { message: string; delayMs: number },
) => {
	const now = new Date();
	const availableAt = new Date(now.getTime() + props.delayMs).toISOString();
	const result = await context.db
		.query("queue.jobs.retry", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({
					status: "queued",
					available_at: availableAt,
					error_message: props.message,
					lease_token: null,
					lease_expires_at: null,
					heartbeat_at: null,
					dispatch_status: "pending",
					next_dispatch_at: now.toISOString(),
					dispatched_at: null,
					dispatch_error: null,
					updated_at: now.toISOString(),
				})
				.where("job_id", "=", job.job_id)
				.where("lease_token", "=", job.lease_token)
				.where("status", "=", "running")
				.where("cancel_requested_at", "is", null)
				.returning("job_id"),
		)
		.first();

	return { result, availableAt };
};

/** Marks a claimed job as permanently failed. */
const failJob = async (
	context: ServiceContext,
	job: ClaimedJob,
	message: string,
) => {
	const now = new Date().toISOString();
	return context.db
		.query("queue.jobs.fail", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({
					status: "failed",
					failed_at: now,
					error_message: message,
					lease_token: null,
					lease_expires_at: null,
					heartbeat_at: null,
					updated_at: now,
				})
				.where("job_id", "=", job.job_id)
				.where("lease_token", "=", job.lease_token)
				.where("status", "=", "running")
				.where("cancel_requested_at", "is", null)
				.returning("job_id"),
		)
		.first();
};

/** Retries or fails a job and runs its permanent failure hook. */
const handleFailure = async (
	context: ServiceContext,
	job: ClaimedJob,
	props: {
		message: string;
		permanent: boolean;
		immediateRetry: boolean;
	},
): Promise<JobConsumptionResult> => {
	const definition = getJobRegistry(context.config).get(
		getJobDefinitionKey({ name: job.job_name, version: job.job_version }),
	);
	const policy = definition?.retry;
	const canRetry =
		!props.permanent &&
		policy?.type === "exponential" &&
		job.attempts < job.max_attempts;

	if (canRetry) {
		const scheduled = await scheduleRetry(context, job, {
			message: props.message,
			delayMs: props.immediateRetry ? 0 : retryDelay(job, policy),
		});
		if (scheduled.result.error) return { type: "retry-transport" };
		if (!scheduled.result.data) {
			await finishCancellation(context, job);
			return { type: "ignored" };
		}
		if (!props.immediateRetry) {
			await dispatchPendingJobs(context, { jobIds: [job.job_id] });
		}
		return { type: "retry-scheduled", availableAt: scheduled.availableAt };
	}

	const failed = await failJob(context, job, props.message);
	if (failed.error) return { type: "retry-transport" };
	if (!failed.data) {
		await finishCancellation(context, job);
		return { type: "ignored" };
	}

	const runtime = definition && getJobDefinitionRuntime(definition);
	if (runtime?.onPermanentFailure) {
		try {
			await runtime.onPermanentFailure(context, {
				jobId: job.job_id,
				input: job.payload,
				attempts: job.attempts,
				errorMessage: props.message,
			});
		} catch (error) {
			logger.error({
				error,
				event: "queue.job.permanent-failure-hook.failed",
				message: "A permanent job failure hook failed",
				scope: constants.logScopes.queueAdapter,
				data: { jobId: job.job_id, jobName: job.job_name },
			});
		}
	}
	return { type: "failed" };
};

/** Claims and handles one attempt of a durable job. */
const consumeAttempt = async (
	context: ServiceContext,
	props: { jobId: string; immediateRetry: boolean },
): Promise<JobConsumptionResult> => {
	const claimed = await claimJob(context, {
		jobId: props.jobId,
		now: new Date(),
	});
	if (claimed.error) return { type: "retry-transport" };
	if (!claimed.data) return resolveUnclaimedJob(context, props.jobId);

	const job = claimed.data;
	const definition = getJobRegistry(context.config).get(
		getJobDefinitionKey({ name: job.job_name, version: job.job_version }),
	);
	if (!definition) {
		return handleFailure(context, job, {
			message: context.translate.english(
				copy("server:core.queue.jobs.definition.missing", {
					data: {
						definition: `${job.job_name}@${job.job_version}`,
					},
				}),
			),
			permanent: true,
			immediateRetry: props.immediateRetry,
		});
	}

	const abortController = new AbortController();
	const stopHeartbeat = startHeartbeat(context, job, abortController);
	try {
		const result = await getJobDefinitionRuntime(definition).execute(
			context,
			job.payload,
			{
				jobId: job.job_id,
				attempt: job.attempts,
				maxAttempts: job.max_attempts,
				signal: abortController.signal,
			},
		);
		if (result.type === "success") {
			const completed = await completeJob(context, job);
			if (completed.error) return { type: "retry-transport" };
			if (!completed.data) {
				await finishCancellation(context, job);
				return { type: "ignored" };
			}
			return { type: "completed" };
		}

		return handleFailure(context, job, {
			message: errorMessage(context, result.error),
			permanent: result.type === "invalid-payload",
			immediateRetry: props.immediateRetry,
		});
	} catch (error) {
		return handleFailure(context, job, {
			message: errorMessage(context, error),
			permanent: false,
			immediateRetry: props.immediateRetry,
		});
	} finally {
		stopHeartbeat();
	}
};

/**
 * Claims and runs one durable job. Queue transports should retry only a
 * `retry-transport` result and acknowledge every other outcome.
 */
export const consumeJob = async (
	context: ServiceContext,
	data: { jobId: string; retry?: "scheduled" | "immediate" },
): Promise<JobConsumptionResult> => {
	const immediateRetry = data.retry === "immediate";
	while (true) {
		const result = await consumeAttempt(context, {
			jobId: data.jobId,
			immediateRetry,
		});
		if (immediateRetry && result.type === "retry-scheduled") continue;
		return result;
	}
};
