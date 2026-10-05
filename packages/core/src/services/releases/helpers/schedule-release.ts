import { enqueueJob } from "../../../libs/jobs/enqueue.js";
import { ReleasesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { executeReleaseJob } from "../jobs/execute.js";
import lockRelease from "./lock-release.js";

/** The queue only holds jobs this far ahead. Later schedules wait for the dispatch job. */
export const QUEUE_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Queues an approved, scheduled release to run at its time. Does nothing when
 * the release is not ready, already queued or too far away to queue yet.
 * Call inside a transaction.
 */
const scheduleRelease: ServiceFn<
	[{ id: number; skipReleaseWriteClaim?: boolean }],
	undefined
> = async (context, data) => {
	const lock = data.skipReleaseWriteClaim
		? undefined
		: await lockRelease(context, data);
	if (lock?.error) return lock;
	await using _lock = lock?.data;
	const Releases = new ReleasesRepository(context.db);

	const releaseRes = await Releases.selectSingle({
		select: [
			"id",
			"status",
			"revision",
			"approved_revision",
			"scheduled_at",
			"scheduled_by",
			"execution_job_id",
		],
		where: [{ key: "id", operator: "=", value: data.id }],
	});
	if (releaseRes.error) return releaseRes;

	const release = releaseRes.data;
	if (
		release?.status !== "open" ||
		release.approved_revision !== release.revision ||
		!release.scheduled_at ||
		release.execution_job_id ||
		!context.queue.support.delayedDelivery
	) {
		return { error: undefined, data: undefined };
	}

	const runAt = new Date(release.scheduled_at);
	const window = Math.min(
		context.queue.support.maxDelayMs ?? QUEUE_WINDOW_MS,
		QUEUE_WINDOW_MS,
	);
	if (runAt.getTime() - Date.now() > window) {
		return { error: undefined, data: undefined };
	}

	const jobRes = await enqueueJob(context, {
		job: executeReleaseJob,
		payload: {
			releaseId: release.id,
			revision: release.revision,
			userId: release.scheduled_by,
		},
		options: {
			runAt,
			createdByUserId: release.scheduled_by ?? undefined,
		},
	});
	if (jobRes.error) return jobRes;

	const updateRes = await Releases.updateSingle({
		data: { execution_job_id: jobRes.data.jobId },
		where: [
			{ key: "id", operator: "=", value: release.id },
			{ key: "revision", operator: "=", value: release.revision },
		],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default scheduleRelease;
