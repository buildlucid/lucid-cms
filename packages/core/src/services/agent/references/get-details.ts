import { referenceKey } from "../../../libs/agent/references.js";
import type { AgentReference } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAccessibleConversation from "../helpers/get-accessible-conversation.js";
import describe from "./describe.js";
import list from "./list.js";

/** Fetches current display details for the resources linked to a chat that the user can read. */
const getDetails: ServiceFn<
	[{ id: string; userId: number }],
	AgentReference[]
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const links = await list(context, {
		conversationId: input.id,
		userId: input.userId,
	});
	if (links.error) return links;

	const details = await describe(context, { references: links.data });
	if (details.error) return details;

	return {
		error: undefined,
		data: links.data.flatMap((link) => {
			const detail = details.data.get(referenceKey(link));
			return detail ? [{ ...link, ...detail }] : [];
		}),
	};
};

export default getDetails;
