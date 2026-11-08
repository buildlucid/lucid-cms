import constants from "../../../constants/constants.js";
import {
	AgentConversationsRepository,
	AgentInputsRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveNotification from "../../notifications/resolve.js";
import { inputNeededNotification } from "../notifications/input-needed.js";
import { agentNotificationKeys } from "../notifications/keys.js";
import executeRunFinishedHooks from "./execute-run-finished-hooks.js";
import wakeParent from "./subagents/wake-parent.js";

/**
 * Cancels the run and pauses its queue. Active workers stop at their next write.
 * @remarks Callers check access. Notifies the parent unless it initiated cancellation.
 * @returns Whether this call stopped the run.
 */
const stopRun: ServiceFn<
	[{ runId: string; conversationId: string; tellParent: boolean }],
	boolean
> = async (context, input) => {
	const now = new Date().toISOString();
	const AgentRuns = new AgentRunsRepository(context.db);
	const AgentConversations = new AgentConversationsRepository(context.db);
	const AgentInputs = new AgentInputsRepository(context.db);

	const paused = await AgentConversations.pauseQueue({
		conversationId: input.conversationId,
		runId: input.runId,
	});
	if (paused.error) return paused;

	const cancelled = await AgentRuns.transition({
		runId: input.runId,
		from: constants.agent.runStatuses.active,
		status: "cancelled",
		now,
	});
	if (cancelled.error) return cancelled;

	const released = await AgentConversations.releaseRun({
		conversationId: input.conversationId,
		runId: input.runId,
		updatedAt: now,
	});
	if (released.error) return released;

	//* a run that had already stopped was told about then
	if (cancelled.data) {
		//* a parent's message still on its way would otherwise start a stopped sub-agent again
		const discarded = await AgentInputs.discardFromParent(input.conversationId);
		if (discarded.error) return discarded;

		await executeRunFinishedHooks(context, { runId: input.runId });

		if (input.tellParent) {
			await wakeParent(context, { conversationId: input.conversationId });
		} else {
			const notified = await AgentRuns.markParentNotified({
				conversationIds: [input.conversationId],
				now,
			});
			if (notified.error) return notified;
		}
	}

	const resolved = await resolveNotification(context, {
		definition: inputNeededNotification,
		key: agentNotificationKeys.input(input.conversationId),
	});
	if (resolved.error) return resolved;

	return { error: undefined, data: cancelled.data };
};

export default stopRun;
