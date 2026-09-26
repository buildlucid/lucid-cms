import { AgentConversationsRepository } from "../../libs/repositories/index.js";
import type { AgentStreamEvent } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getInputs from "./get-inputs.js";

/** Keeps an open chat's queue current without it polling. */
const getInputsEvent: ServiceFn<
	[{ conversationId: string }],
	Extract<AgentStreamEvent, { type: "inputs" }>
> = async (context, input) => {
	const Conversations = new AgentConversationsRepository(context.db);

	const [inputs, conversation] = await Promise.all([
		getInputs(context, input),
		Conversations.selectSingle({
			select: ["queue_paused"],
			where: [{ key: "id", operator: "=", value: input.conversationId }],
		}),
	]);
	if (inputs.error) return inputs;
	if (conversation.error) return conversation;

	return {
		error: undefined,
		data: {
			type: "inputs",
			inputs: inputs.data,
			queuePaused: Boolean(conversation.data?.queue_paused),
		},
	};
};

export default getInputsEvent;
