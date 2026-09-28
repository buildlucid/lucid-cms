import type { ServiceFn } from "../../utils/services/types.js";
import generateTitle from "./helpers/generate-title.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

/** Suggests a title from a chat's saved messages without changing its saved name. */
const generateConversationTitle: ServiceFn<
	[{ id: string; userId: number }],
	{ title: string }
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const generated = await generateTitle(context, {
		conversationId: input.id,
		userId: conversation.data.user_id,
		scope: "conversation",
		runId: conversation.data.latest_run_id ?? undefined,
	});
	if (generated.error) return generated;

	return { error: undefined, data: { title: generated.data } };
};

export default generateConversationTitle;
