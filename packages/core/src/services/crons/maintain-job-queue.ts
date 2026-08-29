import { flushPendingJobs } from "../../libs/queue/jobs/flush-pending-jobs.js";
import { recoverExpiredJobs } from "../../libs/queue/jobs/recover-expired-jobs.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Recovers abandoned work and retries durable queue dispatches. */
const maintainJobQueue: ServiceFn<[], undefined> = async (context) => {
	const recovery = await recoverExpiredJobs(context);
	if (recovery.error) return recovery;

	const dispatch = await flushPendingJobs(context);
	if (dispatch.error) return dispatch;

	return { error: undefined, data: undefined };
};

export default maintainJobQueue;
