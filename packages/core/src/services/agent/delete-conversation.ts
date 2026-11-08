import { AgentConversationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveNotification from "../notifications/resolve.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import { inputNeededNotification } from "./notifications/input-needed.js";
import { agentNotificationKeys } from "./notifications/keys.js";
import { routineNeedsReviewNotification } from "./notifications/routine-needs-review.js";

/** Deletes a conversation with its messages, runs and sub-agent chats, and clears their to-dos. A worker still executing a run stops at its next write. */
const deleteConversation: ServiceFn<
	[{ id: string; userId: number }],
	undefined
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const AgentConversations = new AgentConversationsRepository(context.db);

	//* sub-agent chats go with their parent, so their to-dos are cleared too
	const subagents = await AgentConversations.selectSubagents(input.id);
	if (subagents.error) return subagents;

	const deleted = await AgentConversations.deleteSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (deleted.error) return deleted;

	for (const notification of [
		{
			definition: inputNeededNotification,
			key: agentNotificationKeys.input(input.id),
		},
		...subagents.data.map((subagent) => ({
			definition: inputNeededNotification,
			key: agentNotificationKeys.input(subagent.id),
		})),
		{
			definition: routineNeedsReviewNotification,
			key: agentNotificationKeys.review(input.id),
		},
	]) {
		const resolved = await resolveNotification(context, notification);
		if (resolved.error) return resolved;
	}

	return { error: undefined, data: undefined };
};

export default deleteConversation;
