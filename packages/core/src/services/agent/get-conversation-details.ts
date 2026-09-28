import { AiGenerationsRepository } from "../../libs/repositories/index.js";
import type { AgentConversationDetails } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import getConversationSources from "./helpers/get-conversation-sources.js";
import sumCredits from "./helpers/sum-credits.js";

const getConversationDetails: ServiceFn<
	[{ id: string; userId: number }],
	AgentConversationDetails
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const AiGenerations = new AiGenerationsRepository(context.db);

	const [usage, sources] = await Promise.all([
		AiGenerations.agentUsageByConversation(input.id),
		getConversationSources(context, { conversationId: input.id }),
	]);
	if (usage.error) return usage;
	if (sources.error) return sources;

	return {
		error: undefined,
		data: {
			usage: usage.data.reduce(
				(total, row) => ({
					creditsCharged: sumCredits(
						total.creditsCharged,
						row.credits_charged ?? "0",
						Number(row.calls),
					),
					modelCalls: total.modelCalls + Number(row.model_calls),
					webCalls: total.webCalls + Number(row.web_calls),
				}),
				{ creditsCharged: "0", modelCalls: 0, webCalls: 0 },
			),
			sources: sources.data,
		},
	};
};

export default getConversationDetails;
