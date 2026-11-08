import constants from "../../../../constants/constants.js";
import logger from "../../../../libs/logger/index.js";
import {
	AgentConversationsRepository,
	AgentRunsRepository,
} from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import withTransaction from "../../../../utils/services/with-transaction.js";
import enqueueRun from "../enqueue-run.js";
import isSubagentWaitOver from "./is-subagent-wait-over.js";

/**
 * Wakes the parent when a sub-agent finishes. Call in the finishing transaction.
 * @remarks Notification failures roll back separately and are logged; the agent tick recovers
 * missed wakeups.
 */
const wakeParent: ServiceFn<[{ conversationId: string }], undefined> = async (
	context,
	input,
) => {
	const woken = await withTransaction(
		context,
		async (context) => {
			const Conversations = new AgentConversationsRepository(context.db);
			const Runs = new AgentRunsRepository(context.db);

			const child = await Conversations.selectSingle({
				select: ["parent_conversation_id"],
				where: [{ key: "id", operator: "=", value: input.conversationId }],
			});
			if (child.error) return child;

			const parentId = child.data?.parent_conversation_id;
			if (!parentId) return { error: undefined, data: undefined };

			const parent = await Conversations.selectSingle({
				select: ["active_run_id"],
				where: [{ key: "id", operator: "=", value: parentId }],
			});
			if (parent.error) return parent;
			//* sub-agents stop when their parent's run ends, so an idle parent has nothing to hear
			if (!parent.data?.active_run_id) {
				return { error: undefined, data: undefined };
			}

			const run = await Runs.selectSingle({
				select: ["id", "status", "waiting_for", "checkpoint", "user_id"],
				where: [{ key: "id", operator: "=", value: parent.data.active_run_id }],
			});
			if (run.error) return run;
			//* a parent that's still working picks the result up when it next waits or ends its reply
			if (
				run.data?.status !== "waiting" ||
				run.data.waiting_for !== "subagents"
			) {
				return { error: undefined, data: undefined };
			}

			const over = await isSubagentWaitOver(context, {
				conversationId: parentId,
				checkpoint: run.data.checkpoint,
			});
			if (over.error) return over;
			if (!over.data) return { error: undefined, data: undefined };

			return enqueueRun(context, {
				runId: run.data.id,
				userId: run.data.user_id,
			});
		},
		{ isolate: true },
	);
	if (woken.error) {
		logger.error({
			message: `Agent sub-agent ${input.conversationId} could not wake its parent: ${context.translate(woken.error.message)}`,
			scope: constants.logScopes.ai,
		});
	}

	return { error: undefined, data: undefined };
};

export default wakeParent;
