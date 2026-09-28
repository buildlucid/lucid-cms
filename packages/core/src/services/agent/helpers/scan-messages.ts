import { contextLimits } from "../../../libs/agent/context.js";
import type { LucidAgentMessages } from "../../../libs/db/tables/agent-messages.js";
import type { Select } from "../../../libs/db/types.js";
import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Reads a conversation's saved messages in batches, oldest first, including
 * those summarised out of context. `visit` returns true to stop early. The
 * result says whether it stopped.
 */
const scanMessages: ServiceFn<
	[
		{
			conversationId: string;
			visit: (message: Select<LucidAgentMessages>) => boolean;
		},
	],
	boolean
> = async (context, input) => {
	const Messages = new AgentMessagesRepository(context.db);
	let after = 0;

	while (true) {
		const page = await Messages.selectAfter({
			conversationId: input.conversationId,
			after,
			limit: contextLimits.historyBatch,
		});
		if (page.error) return page;
		if (page.data.some(input.visit)) return { error: undefined, data: true };

		const last = page.data.at(-1);
		if (!last || page.data.length < contextLimits.historyBatch) {
			return { error: undefined, data: false };
		}
		after = last.position;
	}
};

export default scanMessages;
