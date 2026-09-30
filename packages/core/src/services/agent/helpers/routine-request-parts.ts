import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import type { StoredAgentMessagePart } from "../../../schemas/agent.js";
import type { AgentRoutineTrigger } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * A routine run's request. The instructions are always kept for display, but
 * only repeated as text when the chat has no current copy since its last
 * compaction, so a reused chat does not collect a copy for every run.
 */
const routineRequestParts: ServiceFn<
	[
		{
			conversationId: string;
			/** The position the latest compaction summarised through. */
			after: number;
			routine: {
				name: string;
				instructions: string;
				trigger: AgentRoutineTrigger;
			};
		},
	],
	StoredAgentMessagePart[]
> = async (context, input) => {
	const AgentMessages = new AgentMessagesRepository(context.db);

	const requests = await AgentMessages.selectRoutineRequests({
		conversationId: input.conversationId,
		after: input.after,
	});
	if (requests.error) return requests;

	//* every change is sent, so the newest request with text holds the copy the agent has
	const sent = requests.data
		.flatMap((request) => request.parts)
		.find((part) => part.type === "text");

	return {
		error: undefined,
		data: [
			{
				type: "routine",
				name: input.routine.name,
				instructions: input.routine.instructions,
				trigger: input.routine.trigger,
			},
			...(sent?.text === input.routine.instructions
				? []
				: [{ type: "text" as const, text: input.routine.instructions }]),
		],
	};
};

export default routineRequestParts;
