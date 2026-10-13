import type { AgentScreenResponse } from "@lucidcms/types";
import constants from "../../constants/constants.js";
import { checkpointSchema } from "../../libs/agent/types.js";
import logger from "../../libs/logger/index.js";
import { AgentRunsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import enqueueRun from "./helpers/enqueue-run.js";

const closed = {
	status: "unavailable",
	reason: "closed",
} satisfies AgentScreenResponse;

/** Resumes expired screen calls with a closed response, marking runs as notified to prevent later ticks from repeating them. */
const expireScreenCalls: ServiceFn<[], number> = async (context) => {
	const AgentRuns = new AgentRunsRepository(context.db);

	const waiting = await AgentRuns.selectUnnotifiedWaiting({
		waitingBefore: new Date(
			Date.now() - constants.agent.screenCallTimeoutMs,
		).toISOString(),
		screen: true,
		limit: constants.agent.batchSize,
	});
	if (waiting.error) return waiting;

	let expired = 0;

	for (const run of waiting.data) {
		const checkpoint = checkpointSchema.safeParse(run.checkpoint);
		const widget = checkpoint.data?.pending?.widget;
		if (widget?.key !== constants.agent.widgets.screen) continue;

		const sent = await withTransaction(context, async (context) => {
			const AgentRuns = new AgentRunsRepository(context.db);

			//* Skip runs whose execution version changed after selection.
			const marked = await AgentRuns.markInputNotified({
				runId: run.id,
				executionVersion: run.execution_version,
				now: new Date().toISOString(),
			});
			if (marked.error) return marked;
			if (!marked.data) return { error: undefined, data: false };

			const queued = await enqueueRun(context, {
				runId: run.id,
				userId: run.user_id,
				answer: { interactionId: widget.interaction.id, response: closed },
			});
			if (queued.error) return queued;

			return { error: undefined, data: true };
		});
		//* a failed expiry is retried on the next tick without holding up other runs
		if (sent.error) {
			logger.error({
				error: sent.error,
				message: "Agent screen call could not be expired",
				scope: constants.logScopes.ai,
				data: { runId: run.id },
			});
		} else if (sent.data) {
			expired++;
		}
	}

	return { error: undefined, data: expired };
};

export default expireScreenCalls;
