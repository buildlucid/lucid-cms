import {
	type ContextSetup,
	contextLimits,
	contextTokens,
	estimateTokens,
	historyMessage,
	tokenLimit,
} from "../../../libs/agent/context.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { SessionRun } from "./run-session.js";

/**
 * Loads saved messages after `historyAfter` within the context budget, advancing the cursor after each message.
 * @returns True when compaction is needed before more history can load.
 */
const loadHistory: ServiceFn<
	[
		{
			run: SessionRun;
			checkpoint: Checkpoint;
			setup: ContextSetup;
		},
	],
	boolean
> = async (context, { run, checkpoint, setup }) => {
	if (checkpoint.historyAfter === undefined) {
		return { error: undefined, data: false };
	}

	const AgentMessages = new AgentMessagesRepository(context.db);

	const history = await AgentMessages.selectAfter({
		conversationId: run.conversation_id,
		after: checkpoint.historyAfter,
		limit: contextLimits.historyBatch,
	});
	if (history.error) return history;

	const budget = tokenLimit(checkpoint) * contextLimits.compactAt;
	let tokens = contextTokens(checkpoint, setup);

	for (const saved of history.data) {
		//* a saved message loads whole, so a call is never separated from its result
		const { messages, truncated } = historyMessage(saved);
		const size = estimateTokens(messages);
		//* the first message always loads, so compaction has something to summarise
		if (tokens + size > budget && checkpoint.messages.length > 1) {
			return { error: undefined, data: true };
		}

		checkpoint.messages.push(...messages);
		checkpoint.historyAfter = saved.position;
		if (truncated) checkpoint.trimmed = true;
		tokens += size;
	}

	if (history.data.length < contextLimits.historyBatch) {
		checkpoint.historyAfter = undefined;
		if (checkpoint.extraContext) {
			//* shares the request's source so compaction keeps them together
			checkpoint.messages.push({
				role: "user",
				sourceId: run.id,
				content: checkpoint.extraContext,
			});
			checkpoint.extraContext = undefined;
		}
	}

	return { error: undefined, data: false };
};

export default loadHistory;
