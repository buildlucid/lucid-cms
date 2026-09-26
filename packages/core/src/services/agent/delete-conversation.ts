import { AgentConversationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

/** Deletes a conversation with its messages and runs. A worker still executing a run stops at its next write. */
const deleteConversation: ServiceFn<
	[{ id: string; userId: number }],
	undefined
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const AgentConversations = new AgentConversationsRepository(context.db);

	const deleted = await AgentConversations.deleteSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (deleted.error) return deleted;

	return { error: undefined, data: undefined };
};

export default deleteConversation;
