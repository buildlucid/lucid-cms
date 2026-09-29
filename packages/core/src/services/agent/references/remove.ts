import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAccessibleConversation from "../helpers/get-accessible-conversation.js";

/**
 * Unlinks a resource from a chat. Messages keep what was attached, but tools can
 * no longer list or open it through the chat. Removing a missing link succeeds.
 */
const remove: ServiceFn<
	[{ conversationId: string; referenceId: string; userId: number }],
	undefined
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);

	const [media, documents] = await Promise.all([
		Media.deleteMultiple({
			where: [
				{ key: "id", operator: "=", value: input.referenceId },
				{ key: "conversation_id", operator: "=", value: input.conversationId },
			],
		}),
		Documents.deleteMultiple({
			where: [
				{ key: "id", operator: "=", value: input.referenceId },
				{ key: "conversation_id", operator: "=", value: input.conversationId },
			],
		}),
	]);
	if (media.error) return media;
	if (documents.error) return documents;

	return { error: undefined, data: undefined };
};

export default remove;
