import type { LucidAgentConversations } from "../../../libs/db/tables/agent-conversations.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type {
	AgentRunOutcome,
	AgentRunStatus,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Conversations are private to the user who created them. */
const getOwnedConversation: ServiceFn<
	[{ id: string; userId: number }],
	Select<LucidAgentConversations> & {
		latest_run_id: string | null;
		latest_run_status: AgentRunStatus | null;
		latest_run_outcome: AgentRunOutcome | null;
		latest_run_error: string | null;
	}
> = async (context, input) => {
	const AgentConversations = new AgentConversationsRepository(context.db);

	const result = await AgentConversations.selectSingleForUser(input);
	if (result.error) return result;
	if (!result.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.conversation.not.found"),
			},
		};
	}

	return { error: undefined, data: result.data };
};

export default getOwnedConversation;
