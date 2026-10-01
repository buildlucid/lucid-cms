import constants from "../../constants/constants.js";
import type { Media } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getMultipleMedia from "../media/get-multiple.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";
import list from "./references/list.js";

/**
 * Resolves current details for the chat's rich media references that the viewer
 * can read. Preview galleries only show media the chat references, so one request
 * serves every gallery in the chat.
 */
const getMediaPreviews: ServiceFn<
	[{ id: string; userId: number }],
	Media[]
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const references = await list(context, {
		conversationId: input.id,
		userId: input.userId,
	});
	if (references.error) return references;

	const mediaIds = references.data.flatMap((reference) =>
		reference.type === "media" ? [reference.mediaId] : [],
	);
	if (!mediaIds.length) return { error: undefined, data: [] };

	const media = await getMultipleMedia(context, {
		query: {
			filter: {
				id: { value: mediaIds, operator: "in" },
				type: { value: constants.agent.previewMediaTypes, operator: "in" },
				isDeleted: { value: false, operator: "=" },
				ownership: { value: ["library", "user"], operator: "in" },
			},
			page: 1,
			perPage: mediaIds.length,
		},
		actor: { type: "internal" },
	});
	if (media.error) return media;

	return { error: undefined, data: media.data.data };
};

export default getMediaPreviews;
