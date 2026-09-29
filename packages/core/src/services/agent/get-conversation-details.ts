import type { AgentConversationDetails } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import getConversationSources from "./helpers/get-conversation-sources.js";

const getConversationDetails: ServiceFn<
	[{ id: string; userId: number }],
	AgentConversationDetails
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const sources = await getConversationSources(context, {
		conversationId: input.id,
	});
	if (sources.error) return sources;

	return {
		error: undefined,
		data: { sources: sources.data },
	};
};

export default getConversationDetails;
