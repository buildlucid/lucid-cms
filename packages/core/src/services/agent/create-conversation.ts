import type { AgentConversation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import insertConversation from "./helpers/insert-conversation.js";

/** Creates an empty chat with an agent the user can use. */
const createConversation: ServiceFn<
	[{ id?: string; agentKey: string; userId: number; title?: string }],
	AgentConversation
> = async (context, input) => {
	const access = await checkAgentAccess(context, {
		userId: input.userId,
		agentKey: input.agentKey,
		level: "use",
	});
	if (access.error) return access;

	return insertConversation(context, input);
};

export default createConversation;
