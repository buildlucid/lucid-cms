import { urlKeyDigest, webUrlKey } from "../../../libs/agent/url-keys.js";
import { AgentUrlKeysRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Whether a URL appeared in this chat in something the agent did not write: a
 * person's message or a tool result, including CMS content a tool read. This
 * stops the agent reading a URL it made up, such as a known page with data
 * added to its query string.
 */
const isUrlInConversation: ServiceFn<
	[{ url: string; conversationId: string }],
	boolean
> = async (context, input) => {
	const key = webUrlKey(input.url);
	if (!key) return { error: undefined, data: false };

	const AgentUrlKeys = new AgentUrlKeysRepository(context.db);

	const existing = await AgentUrlKeys.selectSingle({
		select: ["url_key"],
		where: [
			{ key: "conversation_id", operator: "=", value: input.conversationId },
			{ key: "url_key", operator: "=", value: urlKeyDigest(key) },
		],
	});
	if (existing.error) return existing;

	return { error: undefined, data: existing.data !== undefined };
};

export default isUrlInConversation;
