import { randomUUID } from "node:crypto";
import constants from "../../../constants/constants.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type {
	AgentConfirmationMode,
	AgentConversation,
	AiModelSelection,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Creates agent chats, sharing code routine chats with the agent's managers when the user is null and using tool defaults with routine confirmation overrides. */
const insertConversation: ServiceFn<
	[
		{
			/** Chosen by the caller, such as the admin opening a chat before it is saved. */
			id?: string;
			agentKey: string;
			confirmationMode?: AgentConfirmationMode;
			modelSelection?: AiModelSelection;
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
			kind:
				input.userId === null
					? "code-routine"
					: input.routineId
						? "own-routine"
						: "chat",
			confirmation_mode: input.routineId
				? "tool-defaults"
				: input.confirmationMode,
			//* resolved when each run starts, so saving a chat never waits on the Lucid service
			model_selection: input.modelSelection ?? null,
			title: input.title ?? constants.agent.defaultTitle,
			title_status:
				input.title && !input.routineId ? "user_set" : "provisional",
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
