import type { StoredAgentMessagePart } from "../../../libs/agent/messages.js";
import { messageUrlKeys, urlKeyDigest } from "../../../libs/agent/url-keys.js";
import { AgentUrlKeysRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Registers URLs that saved messages allow the agent to fetch.
 * @remarks Call in the transaction that saves the messages.
 */
const registerUrlKeys: ServiceFn<
	[
		{
			conversationId: string;
			messages: readonly {
				role: "user" | "assistant";
				parts: readonly StoredAgentMessagePart[];
			}[];
		},
	],
	undefined
> = async (context, props) => {
	const keys = [
		...new Set(
			props.messages.flatMap((message) => [...messageUrlKeys(message)]),
		),
	].map(urlKeyDigest);
	const batchSize = context.config.db.getQueryBatchSize({
		parametersPerItem: 2,
		maxItems: 500,
	});
	const AgentUrlKeys = new AgentUrlKeysRepository(context.db);

	for (let offset = 0; offset < keys.length; offset += batchSize) {
		const inserted = await AgentUrlKeys.insertMultiple({
			conversationId: props.conversationId,
			keys: keys.slice(offset, offset + batchSize),
		});
		if (inserted.error) return inserted;
	}

	return { error: undefined, data: undefined };
};

export default registerUrlKeys;
