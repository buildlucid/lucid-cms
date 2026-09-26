import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentCompactionsRepository } from "../../libs/repositories/index.js";
import type { AgentConversation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getInputs from "./get-inputs.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

const getConversation: ServiceFn<
	[{ id: string; userId: number }],
	AgentConversation
> = async (context, input) => {
	const AgentCompactions = new AgentCompactionsRepository(context.db);

	const [conversation, compactions, inputs] = await Promise.all([
		getAccessibleConversation(context, input),
		AgentCompactions.selectForConversation(input.id),
		getInputs(context, { conversationId: input.id }),
	]);
	if (conversation.error) return conversation;
	if (compactions.error) return compactions;
	if (inputs.error) return inputs;

	return {
		error: undefined,
		data: {
			inputs: inputs.data,
			...agentFormatter.formatConversation({
				conversation: conversation.data,
				compactions: compactions.data,
			}),
		},
	};
};

export default getConversation;
