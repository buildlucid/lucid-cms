import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentMessagesRepository } from "../../libs/repositories/index.js";
import type { AgentMessage } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOwnedConversation from "./helpers/get-owned-conversation.js";

/** Returns a page of messages in display order, ending before the given position. */
const getMessages: ServiceFn<
	[{ conversationId: string; userId: number; before?: number; limit: number }],
	AgentMessage[]
> = async (context, input) => {
	const conversation = await getOwnedConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	const AgentMessages = new AgentMessagesRepository(context.db);

	const messages = await AgentMessages.selectLatest(input);
	if (messages.error) return messages;

	return {
		error: undefined,
		data: messages.data
			.reverse()
			.map((message) => agentFormatter.formatMessage({ message })),
	};
};

export default getMessages;
