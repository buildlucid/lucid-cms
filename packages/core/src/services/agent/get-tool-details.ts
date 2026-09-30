import { copy } from "../../libs/i18n/index.js";
import { AgentMessagesRepository } from "../../libs/repositories/index.js";
import type { AgentToolDetails } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

/** Reads one saved call after checking access to its conversation and message. */
const getToolDetails: ServiceFn<
	[
		{
			conversationId: string;
			messageId: string;
			toolCallId: string;
			userId: number;
		},
	],
	AgentToolDetails
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	const AgentMessages = new AgentMessagesRepository(context.db);

	const message = await AgentMessages.selectSingle({
		select: ["parts"],
		where: [
			{ key: "id", operator: "=", value: input.messageId },
			{ key: "conversation_id", operator: "=", value: input.conversationId },
		],
	});
	if (message.error) return message;

	const tool = message.data?.parts.find(
		(part) => part.type === "tool" && part.id === input.toolCallId,
	);
	if (tool?.type !== "tool") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.tool.not.found"),
			},
		};
	}

	return { error: undefined, data: tool };
};

export default getToolDetails;
