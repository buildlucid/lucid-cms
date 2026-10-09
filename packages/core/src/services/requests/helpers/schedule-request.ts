import formatter from "../../../libs/formatters/index.js";
import { enqueueJob } from "../../../libs/jobs/enqueue.js";
import { RequestsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { executeRequestJob } from "../jobs/execute.js";
import getExecutionActor from "./get-execution-actor.js";
import lockRequest from "./lock-request.js";

/** The queue only holds jobs this far ahead. Later schedules wait for the dispatch job. */
export const QUEUE_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Queues an approved, scheduled request to run at its time. Does nothing when
 * the request is not ready, already queued or too far away to queue yet.
 * Call inside a transaction.
 */
const scheduleRequest: ServiceFn<
	[{ id: number; skipRequestWriteClaim?: boolean }],
	undefined
> = async (context, data) => {
	const lock = data.skipRequestWriteClaim
		? undefined
		: await lockRequest(context, data);
	if (lock?.error) return lock;
	await using _lock = lock?.data;
	const Requests = new RequestsRepository(context.db);

	const requestRes = await Requests.selectSingle({
		select: [
			"id",
			"status",
			"revision",
			"approved_revision",
			"scheduled_at",
			"scheduled_by",
			"scheduled_by_system",
			"scheduled_by_run_id",
			"execution_job_id",
		],
		where: [{ key: "id", operator: "=", value: data.id }],
	});
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	if (
		request?.status !== "open" ||
		request.approved_revision !== request.revision ||
		!request.scheduled_at ||
		request.execution_job_id ||
		!context.queue.support.delayedDelivery
	) {
		return { error: undefined, data: undefined };
	}

	const runAt = new Date(request.scheduled_at);
	const window = Math.min(
		context.queue.support.maxDelayMs ?? QUEUE_WINDOW_MS,
		QUEUE_WINDOW_MS,
	);
	if (runAt.getTime() - Date.now() > window) {
		return { error: undefined, data: undefined };
	}

	const jobRes = await enqueueJob(context, {
		job: executeRequestJob,
		payload: {
			requestId: request.id,
			revision: request.revision,
			actor: getExecutionActor({
				userId: request.scheduled_by,
				system: formatter.formatBoolean(request.scheduled_by_system),
				agentRunId: request.scheduled_by_run_id,
			}),
		},
		options: {
			runAt,
			createdByUserId: request.scheduled_by ?? undefined,
		},
	});
	if (jobRes.error) return jobRes;

	const updateRes = await Requests.updateSingle({
		data: { execution_job_id: jobRes.data.jobId },
		where: [
			{ key: "id", operator: "=", value: request.id },
			{ key: "revision", operator: "=", value: request.revision },
		],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default scheduleRequest;
