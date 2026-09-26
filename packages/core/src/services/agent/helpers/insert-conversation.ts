import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type { AgentConversation } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Inserts a chat with an agent. A null user makes a chat for a code routine, shared with the agent's managers. */
const insertConversation: ServiceFn<
	[
		{
			/** Chosen by the caller, such as the admin opening a chat before it is saved. */
			id?: string;
			agentKey: string;
			userId: number | null;
			title?: string;
			routineId?: string;
		},
	],
	AgentConversation
> = async (context, input) => {
	const now = new Date().toISOString();
	const AgentConversations = new AgentConversationsRepository(context.db);

	const created = await AgentConversations.createSingle({
		data: {
			id: input.id ?? randomUUID(),
			agent_key: input.agentKey,
			title: input.title ?? constants.agent.defaultTitle,
			user_id: input.userId,
			routine_id: input.routineId ?? null,
			active_run_id: null,
			created_at: now,
			updated_at: now,
		},
		returnAll: true,
		validation: { enabled: true },
	});
	if (created.error) return created;

	return {
		error: undefined,
		data: agentFormatter.formatConversation({
			conversation: created.data,
		}),
	};
};

export default insertConversation;
