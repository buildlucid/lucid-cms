import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
} from "../../../libs/repositories/index.js";
import type { AgentReferenceSource } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Unlinks a resource from a chat. Messages keep what was attached, but tools can
 * no longer list or open it through the chat. `source` limits removal to links
 * made that way. Removing a missing link succeeds.
 */
const remove: ServiceFn<
	[
		{
			conversationId: string;
			referenceId: string;
			source?: AgentReferenceSource["type"];
		},
	],
	undefined
> = async (context, input) => {
	const Media = new AgentMediaReferencesRepository(context.db);
	const Documents = new AgentDocumentReferencesRepository(context.db);

	//* the ID is unique across both tables, so the missing row is a no-op
	const deletion = {
		where: [
			{ key: "id", operator: "=", value: input.referenceId },
			{ key: "conversation_id", operator: "=", value: input.conversationId },
			...(input.source
				? [{ key: "source", operator: "=", value: input.source } as const]
				: []),
		],
	} satisfies Parameters<AgentMediaReferencesRepository["deleteMultiple"]>[0];

	const [media, documents] = await Promise.all([
		Media.deleteMultiple(deletion),
		Documents.deleteMultiple(deletion),
	]);
	if (media.error) return media;
	if (documents.error) return documents;

	return { error: undefined, data: undefined };
};

export default remove;
