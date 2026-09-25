import { AgentConversationsRepository } from "../../libs/repositories/index.js";
import type { AgentConversation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getConversation from "./get-conversation.js";
import getOwnedConversation from "./helpers/get-owned-conversation.js";

const updateConversation: ServiceFn<
	[{ id: string; userId: number; title: string }],
	AgentConversation
> = async (context, input) => {
	const conversation = await getOwnedConversation(context, input);
	if (conversation.error) return conversation;

	const AgentConversations = new AgentConversationsRepository(context.db);

	const updated = await AgentConversations.updateSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
		data: { title: input.title, updated_at: new Date().toISOString() },
	});
	if (updated.error) return updated;

	return getConversation(context, input);
};

export default updateConversation;
