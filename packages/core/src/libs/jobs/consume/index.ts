import type { ServiceContext } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import { getJobDefinitionRuntime, getRegisteredJob } from "../registry.js";
import type { JobConsumptionResult, JobTrigger } from "../types.js";
import {
	type ClaimedJob,
	claimJob,
	resolveUnclaimedDelivery,
	startLeaseHeartbeat,
} from "./lease.js";
import { completeJob, handleFailure, toErrorMessage } from "./outcomes.js";

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

	const abortController = new AbortController();
	const stopHeartbeat = startLeaseHeartbeat(context, job, abortController);
	try {
		const result = await getJobDefinitionRuntime(definition).execute(
			context,
			job.payload,
			{
				jobId: job.job_id,
				attempt: job.attempts,
				maxAttempts: job.max_attempts,
				trigger: resolveTrigger(job),
				signal: abortController.signal,
			},
		);
		if (result.type === "success") return completeJob(context, job);

		return handleFailure(context, job, {
			message: toErrorMessage(context, result.error),
			permanent: result.type === "invalid-payload",
			immediateRetry: props.immediateRetry,
		});
	} catch (error) {
		return handleFailure(context, job, {
			message: toErrorMessage(context, error),
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
