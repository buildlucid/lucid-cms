import { AgentConversationsRepository } from "../../libs/repositories/index.js";
import type {
	AgentApprovalMode,
	AgentConversation,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getConversation from "./get-conversation.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

const updateConversation: ServiceFn<
	[
		{
			id: string;
			userId: number;
			title?: string;
			approvalMode?: AgentApprovalMode;
		},
	],
	AgentConversation
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const AgentConversations = new AgentConversationsRepository(context.db);

	const updated = await AgentConversations.updateSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
		data: {
			title: input.title,
			approval_mode: input.approvalMode,
			updated_at: new Date().toISOString(),
		},
	});
	if (updated.error) return updated;

	return getConversation(context, input);
};

export default updateConversation;
