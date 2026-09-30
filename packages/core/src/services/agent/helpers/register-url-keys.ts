import { messageUrlKeys, urlKeyDigest } from "../../../libs/agent/url-keys.js";
import { AgentUrlKeysRepository } from "../../../libs/repositories/index.js";
import type { StoredAgentMessagePart } from "../../../schemas/agent.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Records the URLs a saved message allows the agent to fetch. Call it in the transaction that saves the message. */
const registerUrlKeys: ServiceFn<
	[
		{
			conversationId: string;
			role: "user" | "assistant";
			parts: readonly StoredAgentMessagePart[];
		},
	],
	undefined
> = async (context, props) => {
	const keys = [...messageUrlKeys(props)].map(urlKeyDigest);
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
