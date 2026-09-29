import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import remove from "./references/remove.js";

/** Unlinks a resource from a chat the user can access. Messages keep what was attached. */
const deleteReference: ServiceFn<
	[{ conversationId: string; referenceId: string; userId: number }],
	undefined
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	return remove(context, input);
};

export default deleteReference;
