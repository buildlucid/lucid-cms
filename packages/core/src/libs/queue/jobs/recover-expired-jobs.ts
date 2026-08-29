import z from "zod";
import constants from "../../../constants/constants.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import logger from "../../logger/index.js";
import { getJobDefinitionKey, getJobRegistry } from "../registry.js";
import { jobPayloadSchema } from "../schema.js";
import { getJobDefinitionRuntime } from "../types.js";

const exhaustedJobSchema = z.object({
	job_id: z.string(),
	job_name: z.string(),
	job_version: z.number(),
	payload: jobPayloadSchema,
	attempts: z.number(),
});

const requeuedJobSchema = z.object({
	job_id: z.string(),
});

/** Requeues or fails jobs whose ownership lease has expired. */
export const recoverExpiredJobs = async (
	context: ServiceContext,
): ServiceResponse<{ failed: number; requeued: number }> => {
	const now = new Date().toISOString();
	const finalLeaseError = context.translate.english(
		copy("server:core.queue.jobs.lease.final.expired"),
	);
	const expiredLeaseError = context.translate.english(
		copy("server:core.queue.jobs.lease.expired"),
	);

	const cancelled = await context.db
		.query("queue.jobs.recover.cancelled", (db) =>
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
				.where("status", "=", "running")
				.where("lease_expires_at", "<=", now)
				.where("cancel_requested_at", "is not", null),
		)
		.first();
	if (cancelled.error) return cancelled;

	const exhausted = await context.db
		.query("queue.jobs.recover.exhausted", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({
					status: "failed",
					failed_at: now,
					error_message: finalLeaseError,
					lease_token: null,
					lease_expires_at: null,
					heartbeat_at: null,
					updated_at: now,
				})
				.where("status", "=", "running")
				.where("lease_expires_at", "<=", now)
				.where("cancel_requested_at", "is", null)
				.whereRef("attempts", ">=", "max_attempts")
				.returning([
					"job_id",
					"job_name",
					"job_version",
					"payload",
					"attempts",
				]),
		)
		.many({ schema: exhaustedJobSchema });
	if (exhausted.error) return exhausted;

	for (const job of exhausted.data) {
		const definition = getJobRegistry(context.config).get(
			getJobDefinitionKey({ name: job.job_name, version: job.job_version }),
		);
		const hook =
			definition && getJobDefinitionRuntime(definition).onPermanentFailure;
		if (!hook) continue;
		try {
			await hook(context, {
				jobId: job.job_id,
				input: job.payload,
				attempts: job.attempts,
				errorMessage: finalLeaseError,
			});
		} catch (error) {
			logger.error({
				error,
				event: "queue.job.permanent-failure-hook.failed",
				message: "A recovered job failure hook failed",
				scope: constants.logScopes.queueAdapter,
				data: { jobId: job.job_id, jobName: job.job_name },
			});
		}
	}

	const requeued = await context.db
		.query("queue.jobs.recover.requeue", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({
					status: "queued",
					available_at: now,
					error_message: expiredLeaseError,
					lease_token: null,
					lease_expires_at: null,
					heartbeat_at: null,
					dispatch_status: "pending",
					next_dispatch_at: now,
					dispatched_at: null,
					dispatch_error: null,
					updated_at: now,
				})
				.where("status", "=", "running")
				.where("lease_expires_at", "<=", now)
				.where("cancel_requested_at", "is", null)
				.whereRef("attempts", "<", "max_attempts")
				.returning("job_id"),
		)
		.many({ schema: requeuedJobSchema });
	if (requeued.error) return requeued;

	return {
		error: undefined,
		data: { failed: exhausted.data.length, requeued: requeued.data.length },
	};
};
