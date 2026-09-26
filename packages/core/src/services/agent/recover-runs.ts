import constants from "../../constants/constants.js";
import {
	AgentConversationsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import enqueueRun from "./helpers/enqueue-run.js";

/**
 * Picks up runs whose worker stopped: crashed, interrupted or never started.
 * Each run is retried a few times before it fails.
 */
const recoverRuns: ServiceFn<[], number> = async (context) => {
	const now = new Date().toISOString();
	const runs = new AgentRunsRepository(context.db);
	const conversations = new AgentConversationsRepository(context.db);

	const expired = await runs.interruptExpired({ now });
	if (expired.error) return expired;

	const released = await conversations.releaseFinishedClaims({
		now,
		staleBefore: new Date(Date.now() - constants.agent.leaseMs).toISOString(),
	});
	if (released.error) return released;

	const stalled = await runs.selectRecoverable({
		staleBefore: new Date(
			Date.now() - constants.agent.staleQueuedMs,
		).toISOString(),
		limit: constants.agent.batchSize,
	});
	if (stalled.error) return stalled;

	let recovered = 0;

	for (const run of stalled.data) {
		if (run.recoveries >= constants.agent.limits.recoveries) {
			const failed = await withTransaction(context, async (context) => {
				const AgentRuns = new AgentRunsRepository(context.db);
				const AgentConversations = new AgentConversationsRepository(context.db);

				const moved = await AgentRuns.transition({
					runId: run.id,
					from: ["queued", "interrupted"],
					status: "failed",
					errorMessage: context.translate("server:agent.run.recovery.failed"),
					now,
				});
				if (moved.error || !moved.data) return moved;

				const paused = await AgentConversations.pauseQueue({
					conversationId: run.conversation_id,
					runId: run.id,
				});
				if (paused.error) return paused;

				return AgentConversations.releaseRun({
					conversationId: run.conversation_id,
					runId: run.id,
					updatedAt: now,
				});
			});
			if (failed.error) return failed;

			continue;
		}

		const requeued = await withTransaction(context, async (context) => {
			const AgentRuns = new AgentRunsRepository(context.db);

			const moved = await AgentRuns.transition({
				runId: run.id,
				from: ["queued", "interrupted"],
				status: "queued",
				recovered: true,
				now,
			});
			if (moved.error || !moved.data) return moved;

			const queued = await enqueueRun(context, {
				runId: run.id,
				userId: run.user_id,
			});
			if (queued.error) return queued;

			return { error: undefined, data: true };
		});
		if (requeued.error) return requeued;
		if (requeued.data) recovered++;
	}

	return { error: undefined, data: recovered };
};

export default recoverRuns;
