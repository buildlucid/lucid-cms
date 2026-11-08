import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import startRun from "./helpers/start-run.js";

/** Starts a run that summarises the conversation's context, acting for the requester. */
const compactConversation: ServiceFn<
	[{ conversationId: string; userId: number; runId: string }],
	{ runId: string }
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;
	//* sub-agent chats only take steering while they run
	if (conversation.data.parent_conversation_id) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.subagent.steer.only"),
			},
		};
	}

	return startRun(context, { ...input, purpose: "compact" });
};

export default compactConversation;
