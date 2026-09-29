import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import startRun from "./start-run.js";

/** Answers the chat again after its latest run failed, without a new message, acting for the requester. */
const retryConversation: ServiceFn<
	[{ conversationId: string; userId: number; requestId: string }],
	{ runId: string }
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;
	if (conversation.data.latest_run_status !== "failed") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.retry.unavailable"),
			},
		};
	}

	return startRun(context, { ...input, purpose: "retry" });
};

export default retryConversation;
