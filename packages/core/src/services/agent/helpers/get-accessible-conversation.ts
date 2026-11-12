import type { LucidAgentConversations } from "../../../libs/db/tables/agent-conversations.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { getConversationPermission } from "../../../libs/permission/agent-permissions.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type { LucidAuth } from "../../../types/hono.js";
import type {
	AgentRunOutcome,
	AgentRunStatus,
	AgentRunWaitingFor,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess from "./check-agent-access.js";

/** Chats are private to their user. Chats started by code routines are shared with the agent's managers, and sub-agent chats with whoever can open their parent. */
const getAccessibleConversation: ServiceFn<
	[
		{
			id: string;
			userId: number;
			/** The signed-in user, whose permissions aren't read again when the chat is theirs. */
			auth?: LucidAuth;
		},
	],
	Select<LucidAgentConversations> & {
		latest_run_id: string | null;
		latest_run_status: AgentRunStatus | null;
		latest_run_outcome: AgentRunOutcome | null;
		latest_run_error: string | null;
		latest_run_waiting_for: AgentRunWaitingFor | null;
	}
> = async (context, input) => {
	const AgentConversations = new AgentConversationsRepository(context.db);

	const result = await AgentConversations.selectSingleWithLatestRun(input);
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

	//* a sub-agent chat is open to whoever can open the chat that started it, even when it runs for someone else there
	if (result.data.parent_conversation_id) {
		const parent = await getAccessibleConversation(context, {
			id: result.data.parent_conversation_id,
			userId: input.userId,
			auth: input.auth,
		});
		if (parent.error) return parent;

		return { error: undefined, data: result.data };
	}

	if (result.data.user_id !== null && result.data.user_id !== input.userId) {
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
		auth: input.auth,
		agentKey: result.data.agent_key,
		action: getConversationPermission(result.data.kind),
	});
	if (access.error) return access;

	return { error: undefined, data: result.data };
};

export default getAccessibleConversation;
