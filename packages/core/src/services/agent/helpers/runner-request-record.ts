import type { SessionRun } from "./run-session.js";
import type { PaidRequestRecord } from "./track-paid-request.js";

/** Attributes a request the runner makes itself, such as a model turn, to its run. */
const runnerRequestRecord = (
	run: SessionRun,
	request: Pick<PaidRequestRecord, "requestId" | "featureKey">,
): PaidRequestRecord => ({
	...request,
	runId: run.id,
	conversationId: run.conversation_id,
	userId: run.user_id,
});

export default runnerRequestRecord;
