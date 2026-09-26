import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import startRun from "./start-run.js";

/** Starts a run that summarises the conversation's context, acting for the requester. */
const compactConversation: ServiceFn<
	[{ conversationId: string; userId: number; requestId: string }],
	{ runId: string }
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	return startRun(context, { ...input, purpose: "compact" });
};

export default compactConversation;
