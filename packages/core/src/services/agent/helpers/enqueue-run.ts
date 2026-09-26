import { enqueueJob } from "../../../libs/jobs/enqueue.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { executeAgentRunJob } from "../jobs/execute-run.js";

/** Hands a run to the queue so a background worker continues it. */
const enqueueRun: ServiceFn<
	[{ runId: string; userId: number | null }],
	undefined
> = async (context, input) => {
	const queued = await enqueueJob(context, {
		job: executeAgentRunJob,
		payload: { runId: input.runId },
		options: { createdByUserId: input.userId ?? undefined },
	});
	if (queued.error) return queued;

	return { error: undefined, data: undefined };
};

export default enqueueRun;
