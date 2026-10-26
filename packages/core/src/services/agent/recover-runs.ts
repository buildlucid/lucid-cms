import constants from "../../constants/constants.js";
import { checkpointSchema } from "../../libs/agent/types.js";
import logger from "../../libs/logger/index.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import enqueueRun from "./helpers/enqueue-run.js";
import executeRunFinishedHooks from "./helpers/execute-run-finished-hooks.js";
import notifyRoutineRun from "./helpers/notify-routine-run.js";

/** Retries runs whose workers crashed, stopped or never started up to the recovery limit, returning runs with unanswered questions to waiting unless a steer replaces the answer. */
const recoverRuns: ServiceFn<[], number> = async (context) => {
	const now = new Date().toISOString();
	const runs = new AgentRunsRepository(context.db);
	const conversations = new AgentConversationsRepository(context.db);
	const Inputs = new AgentInputsRepository(context.db);

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
		//* a run stopped while its question was unanswered can only continue with that answer, which an agent runner may
		//* still hold for a retry, so it waits again unless a steer replaces the answer
		const checkpoint = checkpointSchema.safeParse(run.checkpoint);
		if (checkpoint.data?.pending && !checkpoint.data.pending.answer) {
			const inputs = await Inputs.selectDeliverable(run.conversation_id);
			if (inputs.error) {
				logger.error({
					message: `Agent run ${run.id} could not check for a steer: ${context.translate(inputs.error.message)}`,
					scope: constants.logScopes.ai,
				});
				continue;
			}

			if (!inputs.data.some((input) => input.target_run_id === run.id)) {
				const waiting = await runs.transition({
					runId: run.id,
					from: ["queued", "interrupted"],
					status: "waiting",
					now,
				});
				if (waiting.error) {
					logger.error({
						message: `Agent run ${run.id} could not wait for its answer again: ${context.translate(waiting.error.message)}`,
						scope: constants.logScopes.ai,
					});
				}

				continue;
			}
		}

		if (run.recoveries >= constants.agent.limits.recoveries) {
			const failed = await withTransaction(context, async (context) => {
				const AgentRuns = new AgentRunsRepository(context.db);
				const AgentConversations = new AgentConversationsRepository(context.db);
				const message = context.translate("server:agent.run.recovery.failed");

				const moved = await AgentRuns.transition({
					runId: run.id,
					from: ["queued", "interrupted"],
					status: "failed",
					errorMessage: message,
					now,
				});
				if (moved.error || !moved.data) return moved;

				const paused = await AgentConversations.pauseQueue({
					conversationId: run.conversation_id,
					runId: run.id,
				});
				if (paused.error) return paused;

				const released = await AgentConversations.releaseRun({
					conversationId: run.conversation_id,
					runId: run.id,
					updatedAt: now,
				});
				if (released.error) return released;

				if (run.routine_id) {
					await notifyRoutineRun(context, {
						runId: run.id,
						routineId: run.routine_id,
						conversationId: run.conversation_id,
						result: { status: "failed", message },
					});
				}

				await executeRunFinishedHooks(context, { runId: run.id });

				return { error: undefined, data: undefined };
			});
			if (failed.error) {
				logger.error({
					message: `Agent run ${run.id} could not be failed: ${context.translate(failed.error.message)}`,
					scope: constants.logScopes.ai,
				});
			}

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
		if (requeued.error) {
			logger.error({
				message: `Agent run ${run.id} could not be requeued: ${context.translate(requeued.error.message)}`,
				scope: constants.logScopes.ai,
			});
		} else if (requeued.data) recovered++;
	}

	return { error: undefined, data: recovered };
};

export default recoverRuns;
