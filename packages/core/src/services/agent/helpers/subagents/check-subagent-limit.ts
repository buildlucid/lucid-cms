import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/** Refuses to set another of a chat's sub-agents working once `constants.agent.subagents.activeLimit` already are. */
const checkSubagentLimit: ServiceFn<
	[{ conversationId: string }],
	undefined
> = async (context, input) => {
	const Conversations = new AgentConversationsRepository(context.db);

	const subagents = await Conversations.selectSubagents(input.conversationId);
	if (subagents.error) return subagents;

	const { activeLimit } = constants.agent.subagents;
	const working = subagents.data.filter((subagent) => subagent.active_run_id);
	if (working.length >= activeLimit) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.subagent.limit", {
					data: { limit: activeLimit },
				}),
			},
		};
	}

	return { error: undefined, data: undefined };
};

export default checkSubagentLimit;
