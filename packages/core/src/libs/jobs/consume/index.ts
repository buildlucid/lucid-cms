import type { ServiceContext } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import { copy } from "../../i18n/index.js";
import { JobsRepository } from "../../repositories/index.js";
import { getJobDefinitionRuntime, getRegisteredJob } from "../registry.js";
import type {
	JobConsumptionResult,
	JobExecution,
	JobTrigger,
} from "../types.js";
import {
	type ClaimedJob,
	claimJob,
	renewJobLease,
	resolveUnclaimedDelivery,
	startLeaseHeartbeat,
} from "./lease.js";
import {
	completeJob,
	finishCancellation,
	handleFailure,
	toErrorMessage,
} from "./outcomes.js";

type JobRuntime = ReturnType<typeof getJobDefinitionRuntime>;
type JobTransactionFailure =
	| Exclude<Awaited<ReturnType<JobRuntime["execute"]>>, { type: "success" }>
	| { type: "lease-lost" }
	| { type: "retry-transport" };

/** Carries a failed attempt out of its transaction after all work rolls back. */
class JobTransactionError extends Error {
	constructor(readonly result: JobTransactionFailure) {
		super("The job transaction did not complete.");
	}
}

/** Holds ownership and commits the handler's writes with its completion. */
const executeTransactionalJob = async (
	context: ServiceContext,
	job: ClaimedJob,
	runtime: JobRuntime,
	execution: JobExecution,
): Promise<JobConsumptionResult> => {
	const result = await withTransaction(
		context,
		async (context) => {
			//* The write holds the owned job row until this transaction finishes.
			const renewed = await renewJobLease(context, job);
			if (renewed.error) {
				throw new JobTransactionError({ type: "retry-transport" });
			}
			if (!renewed.data) {
				throw new JobTransactionError({ type: "lease-lost" });
			}

			const handled = await runtime.execute(context, job.payload, execution);
			if (handled.type !== "success") throw new JobTransactionError(handled);

			const Jobs = new JobsRepository(context.db);
			const completed = await Jobs.completeClaimed({
				jobId: job.job_id,
				leaseToken: job.lease_token,
				now: new Date().toISOString(),
			});
			if (completed.error) {
				throw new JobTransactionError({ type: "retry-transport" });
			}
			if (!completed.data) {
				throw new JobTransactionError({ type: "lease-lost" });
			}

			return { error: undefined, data: { type: "completed" } as const };
		},
		{ isolate: true },
	);

	return result.error ? { type: "retry-transport" } : result.data;
};

/** Rebuilds the trigger metadata stored against a durable job. */
const resolveTrigger = (job: ClaimedJob): JobTrigger => {
	if (
		job.trigger_type !== "schedule" ||
		job.schedule_key === null ||
		job.scheduled_for === null
	) {
		return { type: "enqueue" };
	}

	return {
		type: "schedule",
		scheduleKey: job.schedule_key,
		scheduledFor:
			job.scheduled_for instanceof Date
				? job.scheduled_for.toISOString()
				: job.scheduled_for,
	};
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
	if (!claimed.data) return resolveUnclaimedDelivery(context, props.jobId);

	const job = claimed.data;
	const definition = getRegisteredJob(context.config, {
		name: job.job_name,
		version: job.job_version,
	});
	if (!definition) {
		return handleFailure(context, job, {
			message: context.translate.english(
				copy("server:core.jobs.definition.missing", {
					data: { definition: `${job.job_name}@${job.job_version}` },
				}),
			),
			permanent: true,
			immediateRetry: props.immediateRetry,
		});
	}

	const runtime = getJobDefinitionRuntime(definition);
	const abortController = new AbortController();
	const execution: JobExecution = {
		jobId: job.job_id,
		attempt: job.attempts,
		maxAttempts: job.max_attempts,
		trigger: resolveTrigger(job),
		signal: abortController.signal,
	};
	const stopHeartbeat = runtime.transaction
		? undefined
		: startLeaseHeartbeat(context, job, abortController);
	try {
		if (runtime.transaction) {
			return await executeTransactionalJob(context, job, runtime, execution);
		}

		const result = await runtime.execute(context, job.payload, execution);
		if (result.type === "success") return completeJob(context, job);

		return handleFailure(context, job, {
			message: toErrorMessage(context, result.error),
			error: result.error,
			permanent: result.type === "invalid-payload",
			immediateRetry: props.immediateRetry,
		});
	} catch (error) {
		if (error instanceof JobTransactionError) {
			if (error.result.type === "retry-transport") return error.result;
			if (error.result.type === "lease-lost") {
				return finishCancellation(context, job);
			}

			return handleFailure(context, job, {
				message: toErrorMessage(context, error.result.error),
				error: error.result.error,
				permanent: error.result.type === "invalid-payload",
				immediateRetry: props.immediateRetry,
			});
		}

		return handleFailure(context, job, {
			message: toErrorMessage(context, error),
			permanent: false,
			immediateRetry: props.immediateRetry,
		});
	} finally {
		stopHeartbeat?.();
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
