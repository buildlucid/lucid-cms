import {
	type ContextCapabilities,
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
 * Loads saved messages after the checkpoint's cursor until context is nearly
 * full. Returns true when it stopped early, so older context must be compacted
 * before the rest can load. History is never skipped.
 */
const loadHistory: ServiceFn<
	[
		{
			run: SessionRun;
			checkpoint: Checkpoint;
			capabilities: ContextCapabilities;
		},
	],
	boolean
> = async (context, { run, checkpoint, capabilities }) => {
	if (checkpoint.historyAfter === undefined) {
		return { error: undefined, data: false };
	}

	const repository = new AgentMessagesRepository(context.db);

	const history = await repository.selectAfter({
		conversationId: run.conversation_id,
		after: checkpoint.historyAfter,
		limit: contextLimits.historyBatch,
	});
	if (history.error) return history;

	const budget = tokenLimit(checkpoint) * contextLimits.compactAt;
	let tokens = contextTokens(checkpoint, capabilities);

	for (const saved of history.data) {
		const { message, truncated } = historyMessage(saved);
		const size = estimateTokens(message);
		//* the first message always loads, so compaction has something to summarise
		if (tokens + size > budget && checkpoint.messages.length > 1) {
			return { error: undefined, data: true };
		}

		checkpoint.messages.push(message);
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
