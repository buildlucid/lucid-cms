import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentCompactionsRepository } from "../../libs/repositories/index.js";
import type { AgentConversation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOwnedConversation from "./helpers/get-owned-conversation.js";

const getConversation: ServiceFn<
	[{ id: string; userId: number }],
	AgentConversation
> = async (context, input) => {
	const AgentCompactions = new AgentCompactionsRepository(context.db);

	const [conversation, compactions] = await Promise.all([
		getOwnedConversation(context, input),
		AgentCompactions.selectForConversation(input.id),
	]);
	if (conversation.error) return conversation;
	if (compactions.error) return compactions;

	return {
		error: undefined,
		data: agentFormatter.formatConversation({
			conversation: conversation.data,
			compactions: compactions.data,
		}),
	};
};

export default getConversation;
