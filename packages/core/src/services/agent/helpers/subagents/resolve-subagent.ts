import type { LucidAgentConversations } from "../../../../libs/db/tables/agent-conversations.js";
import type { Select } from "../../../../libs/db/types.js";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/** Loads a sub-agent chat the calling run's chat started, so tools never reach another chat's sub-agents. */
const resolveSubagent: ServiceFn<
	[{ execution: AgentToolExecution; subagentId: string }],
	Pick<
		Select<LucidAgentConversations>,
		"id" | "agent_key" | "title" | "active_run_id" | "queue_paused"
	>
> = async (context, input) => {
	const Conversations = new AgentConversationsRepository(context.db);

	const subagent = await Conversations.selectSingle({
		select: ["id", "agent_key", "title", "active_run_id", "queue_paused"],
		where: [
			{ key: "id", operator: "=", value: input.subagentId },
			{
				key: "parent_conversation_id",
				operator: "=",
				value: input.execution.run.conversationId,
			},
		],
	});
	if (subagent.error) return subagent;
	if (!subagent.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.subagent.not.found"),
			},
		};
	}

	return { error: undefined, data: subagent.data };
};

export default resolveSubagent;
