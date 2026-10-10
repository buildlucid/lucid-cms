import { enqueueJob } from "../../../libs/jobs/enqueue.js";
import type { JobPayload } from "../../../libs/jobs/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { executeAgentRunJob } from "../jobs/execute-run.js";

/** Queues a run for a background worker to continue, optionally answering its pending interaction. */
const enqueueRun: ServiceFn<
	[
		{
			runId: string;
			userId: number | null;
			answer?: { interactionId: string; response: JobPayload };
		},
	],
	undefined
> = async (context, input) => {
	const queued = await enqueueJob(context, {
		job: executeAgentRunJob,
		payload: {
			runId: input.runId,
			...(input.answer &&
				input.userId !== null && {
					answer: { ...input.answer, userId: input.userId },
				}),
		},
		options: { createdByUserId: input.userId ?? undefined },
	});
	if (queued.error) return queued;

	return { error: undefined, data: undefined };
};

export default enqueueRun;
