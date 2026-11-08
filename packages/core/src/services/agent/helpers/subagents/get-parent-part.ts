import type { StoredAgentMessagePart } from "../../../../libs/agent/messages.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/** Marks a message as sent by the agent that started this sub-agent chat, or returns nothing for other chats. */
const getParentPart: ServiceFn<
	[{ conversationId: string }],
	Extract<StoredAgentMessagePart, { type: "parent" }> | undefined
> = async (context, input) => {
	const Conversations = new AgentConversationsRepository(context.db);

	const child = await Conversations.selectSingle({
		select: ["parent_conversation_id"],
		where: [{ key: "id", operator: "=", value: input.conversationId }],
	});
	if (child.error) return child;

	const parentId = child.data?.parent_conversation_id;
	if (!parentId) return { error: undefined, data: undefined };

	const parent = await Conversations.selectSingle({
		select: ["agent_key"],
		where: [{ key: "id", operator: "=", value: parentId }],
	});
	if (parent.error) return parent;
	if (!parent.data) return { error: undefined, data: undefined };

	return {
		error: undefined,
		data: {
			type: "parent",
			agentKey: parent.data.agent_key,
			conversationId: parentId,
		},
	};
};

export default getParentPart;
