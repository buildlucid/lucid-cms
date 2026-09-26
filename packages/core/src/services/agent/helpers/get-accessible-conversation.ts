import type { LucidAgentConversations } from "../../../libs/db/tables/agent-conversations.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type {
	AgentRunOutcome,
	AgentRunStatus,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess, {
	getConversationLevel,
} from "./check-agent-access.js";

/** Chats are private to their user. Chats started by code routines are shared with the agent's managers. */
const getAccessibleConversation: ServiceFn<
	[{ id: string; userId: number }],
	Select<LucidAgentConversations> & {
		latest_run_id: string | null;
		latest_run_status: AgentRunStatus | null;
		latest_run_outcome: AgentRunOutcome | null;
		latest_run_error: string | null;
	}
> = async (context, input) => {
	const AgentConversations = new AgentConversationsRepository(context.db);

	const result = await AgentConversations.selectSingleWithLatestRun(input);
	if (result.error) return result;
	if (
		!result.data ||
		(result.data.user_id !== null && result.data.user_id !== input.userId)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.conversation.not.found"),
			},
		};
	}

	const access = await checkAgentAccess(context, {
		userId: input.userId,
		agentKey: result.data.agent_key,
		level: getConversationLevel(result.data.user_id),
	});
	if (access.error) return access;

	return { error: undefined, data: result.data };
};

export default getAccessibleConversation;
