import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type { AgentRoutineConversationMode } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * The chat a routine reuses after its chat history setting changes. Switching to
 * reuse adopts the routine's latest chat, and switching to new chats clears it.
 * Returns undefined when the setting is unchanged, so the saved chat is kept.
 */
const resolveRoutineConversation: ServiceFn<
	[
		{
			routineId: string;
			from: AgentRoutineConversationMode;
			to: AgentRoutineConversationMode | undefined;
		},
	],
	string | null | undefined
> = async (context, input) => {
	if (input.to === undefined || input.to === input.from) {
		return { error: undefined, data: undefined };
	}
	if (input.to === "new") return { error: undefined, data: null };

	const AgentConversations = new AgentConversationsRepository(context.db);

	const latest = await AgentConversations.selectLatestForRoutine(
		input.routineId,
	);
	if (latest.error) return latest;

	return { error: undefined, data: latest.data?.id ?? null };
};

export default resolveRoutineConversation;
