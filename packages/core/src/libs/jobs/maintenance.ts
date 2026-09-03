import type { ServiceFn } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import { JobsRepository } from "../repositories/index.js";
import { flushPendingJobs } from "./dispatch.js";
import { runPermanentFailureHook } from "./permanent-failure.js";

/** Requeues or fails jobs whose ownership lease has expired. */
export const recoverExpiredJobs: ServiceFn<
	[],
	{ failed: number; requeued: number }
> = async (context) => {
	const now = new Date().toISOString();
	const finalLeaseError = context.translate.english(
		copy("server:core.jobs.lease.final.expired"),
	);
	const expiredLeaseError = context.translate.english(
		copy("server:core.jobs.lease.expired"),
	);
	const Jobs = new JobsRepository(context.db);

	const cancelled = await Jobs.cancelExpiredLeases(now);
	if (cancelled.error) return cancelled;

	const exhausted = await Jobs.failExhaustedLeases({
		message: finalLeaseError,
		now,
	});
	if (exhausted.error) return exhausted;

	for (const job of exhausted.data) {
		await runPermanentFailureHook(context, {
			job,
			errorMessage: finalLeaseError,
		});
	}

	const requeued = await Jobs.requeueExpiredLeases({
		message: expiredLeaseError,
		now,
	});
	if (requeued.error) return requeued;

	return {
		error: undefined,
		data: { failed: exhausted.data.length, requeued: requeued.data.length },
	};
};

/** Recovers abandoned work and retries durable queue dispatches. */
export const maintainJobQueue: ServiceFn<[], undefined> = async (context) => {
	const recovery = await recoverExpiredJobs(context);
	if (recovery.error) return recovery;

	const dispatch = await flushPendingJobs(context);
	if (dispatch.error) return dispatch;

	return { error: undefined, data: undefined };
};
