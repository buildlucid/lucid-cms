import { agentFormatter } from "../../libs/formatters/index.js";
import type { AgentConversation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOwnedConversation from "./helpers/get-owned-conversation.js";

const getConversation: ServiceFn<
	[{ id: string; userId: number }],
	AgentConversation
> = async (context, input) => {
	const conversation = await getOwnedConversation(context, input);
	if (conversation.error) return conversation;

	return {
		error: undefined,
		data: agentFormatter.formatConversation({
			conversation: conversation.data,
		}),
	};
};

export default getConversation;
